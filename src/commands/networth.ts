import { getDocs, collection } from "@firebase/firestore";
import { db } from "../firebase";
import { showNetWorth } from "../helpers";
import {Message} from "discord.js"

export const networth_command = (msg: Message) => {
  var already_has_account = false;
  (async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const other_persons_wallet = msg.mentions.users.first()
      ? true
      : false;
    var other_id;
    var other_user;
    if (other_persons_wallet) {
      other_id = msg.mentions.users.first()?.id;
      other_user = msg.mentions.users.first();
    }
    // if there's a mention, then id and user should be them
    // if there's not a mention then it's you
    const id = other_persons_wallet ? other_id : msg.author.id;
    const user = other_persons_wallet ? other_user : msg.author;
    querySnapshot.forEach((doc) => {
      if (doc.id == id) {
        already_has_account = true;
        if (user) showNetWorth(msg, user, doc);
      }
    });
    if (!already_has_account && !other_persons_wallet) {
      // Start new wallet
      msg.channel.send("Start a wallet with **!wallet** first.")
    }
    if (!already_has_account && other_persons_wallet) {
      msg.channel.send("This person has not started a wallet with **!wallet** yet.");
    }
  })();
}