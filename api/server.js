"use strict"

const PORT = process.env.PORT || 3005
import express from "express"
import line from "@line/bot-sdk"
import { Configuration, OpenAIApi } from "openai"
import { supabase } from "../src/supabaseClient.js"
import { handler } from "../src/handler.js"

// LINE
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
}

// openai
const configuration = new Configuration({
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY
})

export const openai = new OpenAIApi(configuration)

export const app = express()

app.get("/", async (req, res) => {
  try {
    const replyMessage = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: req.query.message || "こんにちは!" }],
      temperature: 0.7
    })
    res.send(replyMessage.data.choices[0].message.content)
  } catch (e) {
    console.error({ e })
  }
})

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  let lineEvent
  try {
    const result = await Promise.all(
      req.body.events.map((event) => {
        lineEvent = event
        return handleEvent(event)
      })
    )
    res.json(result)
  } catch (e) {
    console.error({ e })
    return client.replyMessage(lineEvent.replyToken, {
      type: "text",
      text: "すみません、おじさんおかしくなっちゃいました😅"
    })
  }
})

const client = new line.Client(lineConfig)

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null)
  }
  const messeageFromUser = event.message.text
  const userId = event.source.userId
  try {
    const { data: previousMessages, error: fetchError } = await supabase
      .from("message")
      .select("content, role")
      .eq("user_id", userId)
    if (fetchError) {
      console.error(fetchError.message)
    }

    const updates = {
      user_id: userId,
      content: messeageFromUser,
      role: "user"
    }

    const { error: postError } = await supabase.from("message").upsert(updates)

    if (postError) {
      console.error(postError.message)
    }

    const previousMessagesToSend = previousMessages
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content
      }))

    const profile = await client.getProfile(userId)

    const replyMessage = await handler({
      previousMessagesToSend,
      messeageFromUser,
      profile
    })

    console.log({ replyMessage })

    const updatesFromOji = {
      user_id: userId,
      content: replyMessage,
      role: "assistant"
    }

    const { error: postErrorOji } = await supabase
      .from("message")
      .upsert(updatesFromOji)

    if (postErrorOji) {
      console.error(postErrorOji.message)
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: replyMessage
    })
  } catch (e) {
    console.error({ e })
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "すみません、おじさんおかしいかも😅"
    })
  }
}

app.listen(PORT)
console.log(`Server running at ${PORT}`)
