import { APIEmbed, APIGuild, APIMessage, APIUser, MessageFlags, MessageType, Snowflake } from "discord-api-types/v8";

const joinMessages = [
    "{@mention} joined the party.",
    "{@mention} is here.",
    "Welcome, {@mention}. We hope you brought pizza.",
    "A wild {@mention} appeared.",
    "{@mention} just landed.",
    "{@mention} just slid into the server.",
    "{@mention} just showed up!",
    "Welcome {@mention}. Say hi!",
    "{@mention} hopped into the server.",
    "Everyone welcome {@mention}!",
    "Glad you're here, {@mention}!",
    "Good to see you, {@mention}.",
    "Yay you made it, {@mention}!"
]

export default async function renderMessage(message: APIMessage, user: APIUser, guildId: Snowflake): Promise<APIEmbed[] | undefined> {
    const color = 0x2f3136;
    const url = `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;

    const base: APIEmbed = {
        color,
        url,
        fields: [{
            name: "\u200b",
            value: `[Jump to message](${url})`
        }],
        timestamp: message.timestamp,
        footer: {
            text: (message.edited_timestamp ? "Edited •" : "") + `Quoted by ${user.username}#${user.discriminator}`
        }
    }
    
    switch (message.type) {
        case MessageType.DEFAULT: {
            if (!message.content && !message.attachments.length) return undefined;
    
            const embeds: APIEmbed[] = [{
                ...base,
                description: message.content,
                author: {
                    name: `${message.author.username}#${message.author.discriminator}`,
                    icon_url: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.${message.author.avatar?.startsWith("a_") ? "gif" : "png"}`
                },
                url
            }];
    
            message.attachments.forEach((attachment, i) => {
                if (!embeds[i]) embeds[i] = { url };
                embeds[i].image = { url: attachment.url }
            });
    
            return embeds;
        }

        case MessageType.CHANNEL_PINNED_MESSAGE: {
            const pinUrl = `https://discord.com/channels/${guildId}/${message.channel_id}/${message.message_reference?.message_id}`;
    
            return [{
                ...base,
                description: `<@!${message.author.id}> pinned [a message](${pinUrl}) to this channel.`
            }];
        }

        case MessageType.GUILD_MEMBER_JOIN: {
            return [{
                ...base,
                description: `<:join:754438854487965807> ${joinMessages[Number(new Date(message.timestamp)) % joinMessages.length].replace("{@mention}", `<@!${message.author.id}>`)}`
            }];
        }

        case MessageType.USER_PREMIUM_GUILD_SUBSCRIPTION,
             MessageType.USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1,
             MessageType.USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2,
             MessageType.USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3: {
                const level = message.type - 8;
                const guild = level === 0 ? null : await fetch(`https://discord.com/api/v9/guilds/${guildId}`, {
                    headers: {
                        Authorization: `Bot ${token}`
                    }
                }).then(res => res.json()) as APIGuild;
                return [{
                    ...base,
                    description: `<:boost:699118352727277658> <@!${message.author.id}> boosted **${message.content}** times!${level > 0 ? `${guild?.name} has achieved **Level ${level}!**` : ""}`
                }];
        }

        case MessageType.CHANNEL_FOLLOW_ADD: {
            return [{
                ...base,
                description: `<:join:754438854487965807> <@!${message.author.id}> has added **${message.content}** to this channel. Its most important updates will show up here.`
            }];
        }

        case MessageType.REPLY: {
            if (!message.content && !message.attachments.length) return undefined;
            const replyUrl = `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
    
            const embeds: APIEmbed[] = [{
                ...base,
                description: `<:reply:839322883922853918> <@!${message.author.id}> replied to ${message.referenced_message ? `<@!${message.referenced_message.author.id}>` : "a deleted message"}${message.content ? ":" : ""}\n${message.content}`,
                author: {
                    name: `${message.author.username}#${message.author.discriminator}`,
                    icon_url: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.${message.author.avatar?.startsWith("a_") ? "gif" : "png"}`
                },
                url,
                fields: [{
                    name: "\u200b",
                    value: `[Jump to message](${url}) | [Jump to replied message](${replyUrl})`,
                    inline: true
                }]
            }];
    
            message.attachments.forEach((attachment, i) => {
                if (!embeds[i]) embeds[i] = { url };
                embeds[i].image = { url: attachment.url }
            });
    
            return embeds;
        }

        case MessageType.GUILD_DISCOVERY_DISQUALIFIED: {
            return [{
                ...base,
                description: "<:discoveryx:839325739136712725> This server has been removed from Server Discovery because it no longer passes all the requirements."
            }];
        }

        case MessageType.GUILD_DISCOVERY_REQUALIFIED: {
            return [{
                ...base,
                description: "<:discoverycheck:839325739144052736> This server is eligible for Server Discovery again and has been automatically relisted!"
            }];
        }

        case MessageType.GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING: {
            return [{
                ...base,
                description: `<:discoverywarn:839325738784260117> This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery.`
            }];
        }

        case MessageType.GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING: {
            return [{
                ...base,
                description: `<:discoverywarn:839325738784260117> This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery.`
            }];
        }

        // case MessageType.APPLICATION_COMMAND: {
        //     return [{
        //         ...base,
        //         description: `<:iconslashcommands:785919558376488990> <@!${message.interaction?.user.id}> used **/${message.interaction?.name}** with <@!${message.author.id}>`
        //     }];
        // }

        default: {
            return [{
                color,
                description: `I'm not sure how to render this message. You can [jump to it](${url}) and view it yourself.`,
            }];
        }
    }
}