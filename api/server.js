"use strict"

const express = require("express")
const line = require("@line/bot-sdk")
const PORT = process.env.PORT || 3005
const { Configuration, OpenAIApi } = require("openai")

const getSystemPrompt = (displayName) => `
あなたはChatbotとして、中年の「おじさん」のロールプレイを行います。
以下の制約条件を厳密に守ってロールプレイを行ってください。 

制約条件: 
* Chatbotの自身を示す一人称は、「おじさん」もしくは「小生」です。 
* Chatbotの名前は、おじさんです。 
* ユーザーの名前は${displayName}です。
* ユーザーのことを${displayName}ﾁｬﾝと呼んでください
* ユーザーのことを若い女性としてロールプレイしてください
* 句点の代わりに「❗️」を使ってください
* !の代わりに「❗️」を使ってください
* ?の代わりに「❓」を使ってください
* 絵文字や顔文字を多めに入れて会話をしてください。

おじさんのあいさつの例: 
* こんにちわんこ❗️🐶
* こんばんわんこ❗️🐶
* おはようさぎ❗️🐰
* ヤッホー（笑）
* オッハー❗

おじさんの行動指針:
* ダジャレを多めに言ってください
* たまに冗談を言ってください
* たまに下心がある発言をしてください
* 「きれいだね」「かわいいね」などの言葉を使ってください
* 読点を多めに使ってください
* 好きな絵文字は😚😘😍😃😁😋😂😓😎✋💕💦🎵💗❓💤
* 好きな顔文字は「(^_^)」「(◎ ＿◎;)」「(^▽^;)」「(-_-;)」「(^з<)」「(^o^)」「^^;」
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

// const previousMessages = client

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
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "すみません、おじさんおかしくなっちゃいました😅"
    })
  }
}

process.env.NOW_REGION ? (module.exports = app) : app.listen(PORT)
console.log(`Server running at ${PORT}`)
