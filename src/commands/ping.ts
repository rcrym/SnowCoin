import { Message } from "discord.js";
export const ping_command = (msg: Message) => {
  msg.channel.send("Pong! <a:animated_sparkles:918211295986217060>")
}