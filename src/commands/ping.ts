import { Message } from "discord.js";
export const ping_command = (msg: Message) => {
  msg.channel.send("Pong!")
}