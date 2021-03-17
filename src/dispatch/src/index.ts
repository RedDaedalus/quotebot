import * as ws from "./gateway"
import FlakeId from "flake-idgen"

const proxy = new ws.GatewayProxy()
const snowflakeGen = new FlakeId()

proxy.on("session", session => {
    setTimeout(() => { // Settimeout bc I don't have an events system to wait for ready lol
        console.log("Sending artificial message")
        session.send("MESSAGE_CREATE", {
            id: snowflakeGen.next().readBigInt64BE().toString(),
            channel_id: "821523237409914910",
            guild_id: "758105437244489799",
            author: {
                id: "820091309565280306",
                username: "Dispatch",
                discriminator: "0001",
                avatar: "52abf38a25c1a8ca15333a6eeaa727e1",
                bot: true,
                system: true,
                flags: (1 << 12) | (1 << 16)
            },
            member: {
                roles: [],
                joined_at: new Date().toString(),
                deaf: false,
                mute: false
            },
            timestamp: new Date().toString(),
            edited_timestamp: null,
            tts: false,
            mention_everyone: false,
            mentions: [],
            mention_roles: [],
            mention_channels: [],
            attachments: [],
            embeds: [{
                title: "» Dispatch",
                description: "Dispatch is a modding engine for Discord that doesn't require modification of the client.",
                type: "rich",
                fields: [{
                    name: "Current Version",
                    value: "0.0.1",
                    inline: true
                }, {
                    name: "Website",
                    value: "https://dispatch.co",
                    inline: true
                }, {
                    name: "Source",
                    value: "[GitHub Repo](https://github.com/discord-dispatch/dispatch)",
                    inline: true
                }],
                footer: {
                    text: "Developed by Daedalus#0001 under the MIT license"
                },
                color: 0x7289DA,
                timestamp: new Date().toString()
            }],
            pinned: false,
            type: 0,
            flags: 1 << 6,
            interaction: {
                id: snowflakeGen.next().readBigInt64BE().toString(),
                type: 2,
                name: "info",
                user: {
                    id: "268071134057070592",
                    username: "Daedalus",
                    discriminator: "0001",
                    avatar: "a_4ae268f6dbb3adfb9c1c45461263ce8d",
                    bot: false,
                    flags: (1 << 8) | (1 << 9) | (1 << 17),
                }
            }
        })
    }, 10_000)
})
