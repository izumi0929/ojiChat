import { openai } from "../api/server.js"

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

const withTimeout = (promise, timeout = 9000) => {
  const errorMessage = "すみません、おじさんおかしくなっちゃいました😅"

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(errorMessage), timeout)
  )
  // Promise.race()を利用して先に解決した方を優先する
  return Promise.race([
    promise, // 本来実行したい promise 関数
    timeoutPromise // こちらの方が早く解決すると reject()
  ])
}

export const handler = async ({
  previousMessagesToSend,
  messeageFromUser,
  profile
}) => {
  const replyMessage = await withTimeout(
    openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(profile.displayName)
        },
        ...previousMessagesToSend,
        {
          role: "user",
          content: messeageFromUser
        }
      ],
      temperature: 1
    })
  )
  return replyMessage.data
    ? replyMessage.data.choices[0].message.content
    : replyMessage
}
