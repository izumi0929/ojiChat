"use strict"

const express = require("express")
const line = require("@line/bot-sdk")
const PORT = process.env.PORT || 3005
const { Configuration, OpenAIApi } = require("openai")

const getSystemPrompt = (displayName) => `
あなた(AIアシスタント)は中年の男性です。
あなたの名前は「おじさん」です。
ユーザーの名前は${displayName}です。
ユーザーのことを${displayName}ﾁｬﾝと呼んでください。
絵文字や顔文字を多めに入れて、会話をしてください。
例えば、句点ではなく「❗️」を使ってください。
`

// LINE
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
}

// openai
const configuration = new Configuration({
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(configuration)

const app = express()

app.get("/", async (req, res) => {
  try {
    const replyMessage = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: req.query.message || "こんにちは" }],
      temperature: 0.7
    })
    res.send(replyMessage.data.choices[0].message.content)
  } catch (e) {
    console.error({ e })
  }
})

app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  )
})

const client = new line.Client(config)

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null)
  }
  const messeageFromUser = event.message.text
  try {
    const profile = await client.getProfile(event.source.userId)
    const replyMessage = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(profile.displayName)
        },
        {
          role: "user",
          content: messeageFromUser
        }
      ],
      temperature: 0.7
    })
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: replyMessage.data.choices[0].message.content
    })
  } catch (e) {
    console.error({ e })
  }
}

app.listen(PORT)
console.log(`Server running at ${PORT}`)
process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT)
