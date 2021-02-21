const nacl = require('tweetnacl')
const { Buffer } = require('buffer')

// This has to be moved to secrets but idk how to do it lol
const { publicKey, token } = require('./config.json')

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Key verification
  const timestamp = request.headers.get('X-Signature-Timestamp')
  const signature = request.headers.get('X-Signature-Ed25519')

  if (!timestamp || !signature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const bodyText = await request.text()
  const body = JSON.parse(bodyText)

  try {
    // Verify "timestamp + body" with signature
    if (!nacl.sign.detached.verify(
      Buffer.from(timestamp + bodyText),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    )) {
      return new Response('Forbidden', { status: 403 })
    }
  } catch(exception) {
    console.error(exception)
    return new Response('Failed to authenticate the given key', { code: 500 })
  }

  if (body.type === 1) {
    return ping()
  } else if (body.type === 2) {
    if (body.data.name === 'quote') {
      return quoteMessage(body)
    } else {
      return new Response(JSON.stringify({
        type: 3,
        data: {
          flags: 64,
          content: `
<:iconquote:778925506081980437> **Welcome to QuoteBot**
QuoteBot introduces easy enhanced quotes using [slash commands](https://support.discord.com/hc/en-us/articles/1500000368501).
To use the bot, just type \`/quote <message link>\`, and a quote will be displayed.

<:CreateInvite:329756691555942410> **Click [here](https://discord.com/api/oauth2/authorize?client_id=812892218925776916&permissions=65536&scope=bot+applications.commands) to invite QuoteBot**
          `
        }
      }))
    }
  }
}

/**
 * Sends an ephemeral error message.
 * @param {String} message 
 * @returns A Response object to be sent
 */
async function error(message) {
  return new Response(JSON.stringify({ 
    type: 3,
    data: {
      flags: 64,
      content: `**Error:** ${message}`
    }
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

async function ping() {
  return new Response(JSON.stringify({ type: 1 }), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

async function quoteMessage(interaction) {
  if (!interaction['guild_id']) {
    return error('This command cannot be used from a direct message.')
  }

  // Split URL into fragments:
  // 4: guild ID or "@me" for DMs
  // 5: channel ID
  // 6: message ID
  const fragments = interaction.data.options[0].value.split('/')
  if (fragments[4] !== interaction['guild_id']) {
    return error('You cannot quote messages from outside of this server.')
  }
  
  // Send message request
  const request = await fetch(`https://discord.com/api/v8/channels/${fragments[5]}/messages/${fragments[6]}`, {
    headers: {
      'Authorization': `Bot ${token}`
    }
  })

  // Handle errors
  if (request.status === 403) {
    return error('I cannot access that channel.')
  }

  if (request.status === 404) {
    return error('Unknown or invalid message.')
  }

  if (request.status === 429) {
    return error('Our systems are currently catching up! Please try again in a few seconds.')
  }

  if (request.status != 200) {
    return error(`An unknown error has occurred (error code ${request.status}).`)
  }

  const message = await request.json()

  const avatarHash = message.author.avatar
  const avatar = avatarHash 
    ? `https://cdn.discordapp.com/avatars/${message.author.id}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'png'}`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(message.author.discriminator) % 5}.png`

  const url = `https://discord.com/channels/${fragments[4]}/${fragments[5]}/${fragments[6]}`

  if (!message.content && !message.attachments.length) {
    return error('You cannot quote an empty message.')
  }
  
  // Serialize reply
  const ref = message['referenced_message']
  const reply = message.type === 19 ? ReferenceError ? `${ref.author.username}#${ref.author.discriminator}` : 'a deleted message' : null

  const embeds = [{
    color: 0x7289DA,
    url,
    author: {
      name: `${message.author.username}#${message.author.discriminator}${reply ? ` replied to ${reply}` : ''}`,
      'icon_url': avatar
    },
    description: message.content,
    fields: [{
      name: '\u200b',
      value: `[Jump to original](${url})`
    }],
    footer: {
      text: message['edited_timestamp'] ? 'Edited' : null
    },
    timestamp: message.timestamp
  }]

  // Add attachments to embed
  message.attachments.filter(attachment => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(attachment.filename.split('.').pop()))
    .forEach((attachment, index) => {
      if (!embeds[index]) embeds[index] = { url }
      embeds[index].image = {
        url: attachment.url
      }
    })

  return new Response(JSON.stringify({
    type: 4,
    data: { embeds }
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}