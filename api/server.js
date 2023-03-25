"use strict"

const express = require("express")
const line = require("@line/bot-sdk")
const PORT = process.env.PORT || 3005

const config = {
  channelSecret: "a0522455fb2cdafd6df0e7f818da2d28",
  channelAccessToken:
    "eyJhbGciOiJIUzI1NiJ9.UL5AzbnOlIyDFuWz7OQA6fnCq7cD5Ts1EOjeHNWLD_2h3Q2nxCvQBJzJSdhCK1nwcY5uo9qDrSWUizVd6hjrpUEGrss3z13UA0JFs3Ac7H_3ulOky8zDQMztaNvFFN74.-ehDYRI4uZF-AyS0gSTjEgpfxaFz6jXgZr1txEOev44"
}

const app = express()

app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)")) //ブラウザ確認用(無くても問題ない)
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events)

  //ここのif分はdeveloper consoleの"接続確認"用なので削除して問題ないです。
  if (
    req.body.events[0].replyToken === "00000000000000000000000000000000" &&
    req.body.events[1].replyToken === "ffffffffffffffffffffffffffffffff"
  ) {
    res.send("Hello LINE BOT!(POST)")
    console.log("疎通確認用")
    return
  }

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  )
})

const client = new line.Client(config)

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null)
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: event.message.text //実際に返信の言葉を入れる箇所
  })
}

app.listen(PORT)
console.log(`Server running at ${PORT}`)
process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT)
console.log(`Server running at ${PORT}`)
