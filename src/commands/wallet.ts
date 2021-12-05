import { getDocs, collection, setDoc, doc } from "@firebase/firestore";
import { db } from "../firebase";
import { showWallet } from "../helpers";
import {Message} from "discord.js"

export const wallet_command = (msg: Message) => {
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
        if (user) showWallet(msg, user, doc);
      }
    });
    if (!already_has_account && !other_persons_wallet) {
      // Start new wallet
      await setDoc(doc(db, "users", msg.author.id), {
        name: msg.author.username,
        tag: msg.author.tag,
        balance: 100,
      });
      const querySnapshot = await getDocs(collection(db, "users"));
      // Check new wallet exists in database
      querySnapshot.forEach((doc) => {
        if (doc.id == msg.author.id) {
          msg.reply(
            `Your wallet has been initialized. Use **!pay [@user][amount]** to send funds.`
          );
          if (user) showWallet(msg, user, doc);
        }
      });
    }
    if (!already_has_account && other_persons_wallet) {
      msg.channel.send("This person has not started a wallet with **!wallet** yet.");
    }
  })();
}