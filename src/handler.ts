import { verifyKey } from "discord-interactions";
import { ApplicationCommandInteractionDataOptionString as APIStringOption, APIInteraction, APIInteractionResponse, InteractionResponseType, InteractionType, APIGuildInteraction, MessageFlags, APIMessage, APIChannel, PermissionFlagsBits, APIGuildMember, Snowflake, APIInteractionGuildMember, OverwriteType, APIEmbed, APIEmbedImage } from "discord-api-types/v8";
import renderMessage from "./render";

export default async function handleRequest(request: Request): Promise<Response> {
    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");

    const body = await request.text();

    if (!signature || !timestamp || !verifyKey(body, signature, timestamp, publicKey)) {
        return new Response("", { status: 401 });
    }

    const interaction: APIInteraction = JSON.parse(body);

    if (interaction.type === InteractionType.Ping) {
        return respond({ type: InteractionResponseType.Pong });
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.data!.name === "about") {
            return respond({
                type: 4,
                data: {
                    flags: 1 << 6,
                    embeds: [{
                        color: 0x7289DA,
                        title: "<:iconquote:778925506081980437> About QuoteBot",
                        description: "QuoteBot is a bot made by Daedalus#0001 designed to allow you to send simple, easy to read quotes. To use it, just type `/quote <message link to quote>`.",
                        fields: [{
                            name: "» Support Server",
                            value: "https://discord.gg/k4Wr7YTQJK",
                            inline: true
                        }, {
                            name: "» Source",
                            value: "https://github.com/RedDaedalus/quotebot",
                            inline: true
                        }]
                    }]
                }
            });
        }

        const guildInteraction = interaction as APIGuildInteraction;
        if (!guildInteraction.member) {
            return respond("<:error:837444069974081617> This command cannot be used from direct messages.", MessageFlags.EPHEMERAL);
        }

        const messageLink = (interaction.data!.options![0] as APIStringOption).value;
        const data = messageLink.split("/").reverse();

        if (data.length < 3) return respond("<:error:837444069974081617> Please provide a valid message link.", MessageFlags.EPHEMERAL);
        const [messageId, channelId, guildId] = data;

        if (guildId !== guildInteraction.guild_id) return respond(`<:error:837444069974081617> You can only quote messages from inside this server. ${guildId} ${guildInteraction.guild_id}`, MessageFlags.EPHEMERAL);

        const message: APIMessage = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
            headers: {
                Authorization: `Bot ${token}`
            }
        }).then(res => res.json());

        if (interaction.data!.name === "quote") {
            const embeds = await renderMessage(message, guildInteraction.member.user, guildInteraction.guild_id);
            if (!embeds) return respond("<:error:837444069974081617> This message cannot be quoted.");

            return respond({
                type: 4,
                data: {
                    embeds
                }
            });
        }

        if (interaction.data!.name === "source") {
            return respond("```json\n" + JSON.stringify(message, null, "\t") + "\n```", MessageFlags.EPHEMERAL);
        }
    }

    return new Response("Unsupported interaction type", { status: 400 });
}

function respond(response: APIInteractionResponse | string, flags?: MessageFlags): Response {
    if (typeof response === "string") return respond({
        type: 4,
        data: {
            flags,
            content: response
        }
    });

    return new Response(JSON.stringify(response), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}
