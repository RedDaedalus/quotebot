import EventListener from "events"
import WebSocket from "ws"
import erlpack from "erlpack"
import pako from "pako"
import querystring from "querystring"

export class GatewayProxy extends EventListener {

    constructor() {
        super()

        const server = new WebSocket.Server({ port: 11000 })
        server.on("connection", (ws, req) => {
            const { encoding } = querystring.parse(req.url.substring(2))
            console.log("Starting new session")
            console.log(encoding)
            const session = new GatewaySession(ws, encoding as string)
            this.emit("session", session)
            console.log("New session")
        })
    }
}

export class GatewaySession {

    private inflate = new pako.Inflate()
    private deflate = new pako.Deflate()
    private encoding: string
    private wsRemote: WebSocket
    private wsLocal: WebSocket
    
    constructor(ws: WebSocket, encoding: string) {
        this.encoding = encoding
        this.wsRemote = new WebSocket(`wss://gateway.discord.gg/?v=8&encoding=${encoding}&compress=zlib-stream`)
        this.wsLocal = ws

        this.wsRemote.on("message", (chunk: Buffer) => {
            this.inflate.push(chunk, 2)
            const result = Buffer.from(this.inflate.result)

            this.deflate.push(result, 2)
            const outgoing = Buffer.from(this.deflate.result)

            this.wsLocal.send(outgoing, e => e ? console.error(e) : undefined)
        })
        this.wsRemote.on("close", (code, reason) => console.log(`Closed: ${code} ${reason}`))
        this.wsLocal.on("message", (chunk: Buffer) => {
            this.wsRemote.send(chunk, e => e ? console.error(e) : undefined)
        })
    }

    send(event: string, data: any) {
        if (!data.op) data = { op: 0, d: data, s: null, t: event }

        let message
        if (this.encoding === "etf") {
            message = erlpack.pack(data)
        } else if (this.encoding === "json") {
            message = Buffer.from(JSON.stringify(data))
        }
        this.deflate.push(message, 2)
        this.wsLocal.send(Buffer.from(this.deflate.result))
    }
}

export enum PacketDirection {

    Incoming = 0,
    Outgoing = 1
}