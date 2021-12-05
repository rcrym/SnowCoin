import { doc, getDoc, setDoc } from "@firebase/firestore";
import { Message } from "discord.js";
import { db } from "../firebase";
import { userIDToWalletID } from "../helpers";

export const pay_command = (msg: Message) => {
    var start: any = new Date();
    const user = msg.mentions.users.first();
    if (user === undefined) {
        return; // Do not proceed, there is no user.
    }
    console.log(msg.content.split(" "));
    const amount = Number.parseFloat(
        msg.content.split(" ")[msg.content.split(" ").length - 1]
    );
    if (amount <= 0) {
        msg.channel.send(
            "Nope, not any more. Payment amount must be greater than zero."
        );
        return;
    }
    if (amount < 0.1) {
        msg.channel.send(
            "Smallest allowed payment is **0.1** SWC"
        );
        return;
    }
    if (!amount) {
        msg.channel.send(
            "Something's wrong with your command. It should be **!pay [@user][amount]** where amount is a number."
        );
        return;
    }
    (async () => {
        const docRef_payer = doc(db, "users", msg.author.id);
        var docSnap_payer = await getDoc(docRef_payer);
        var balance_payer: number;
        if (docSnap_payer.exists()) {
            balance_payer = await docSnap_payer.data().balance;
            if (balance_payer - amount < 0) {
                msg.channel.send(
                    "Insufficent funds to complete that transfer."
                );
                return;
            }
            await setDoc(
                doc(db, "users", msg.author.id),
                {
                    balance: balance_payer - amount,
                },
                { merge: true }
            );
            // Fetch payer balance again because you just changed their balance
            docSnap_payer = await getDoc(docRef_payer);
            const docRef_recip = doc(db, "users", user.id);
            var docSnap_recip = await getDoc(docRef_recip);
            var balance_recip: number;
            console.log(docSnap_recip.exists());
            if (docSnap_recip.exists()) {
                balance_recip = await docSnap_recip.data().balance;
                await setDoc(
                    doc(db, "users", user.id),
                    {
                        balance: balance_recip + amount,
                    },
                    { merge: true }
                );
                // Fetch recipient balance again because you just changed their balance
                docSnap_recip = await getDoc(docRef_recip);
                var end: any = new Date();
                var millisecondsElapsed = end - start;
                msg.channel.send({
                    embeds: [
                        {
                            title: `**${amount} SWC** transfered to ${user.username}'s wallet`,
                            description: `${userIDToWalletID(
                                docRef_payer.id
                            )} :arrow_right: ${userIDToWalletID(
                                docRef_recip.id
                            )}`,
                            color: 3192405,
                            footer: {
                                text: `Transfer time ${millisecondsElapsed}ms`,
                            },
                            thumbnail: {
                                url: `${user.displayAvatarURL()}`,
                            },
                            fields: [
                                {
                                    name: "Your new balance",
                                    value: `${
                                        docSnap_payer.data()?.balance
                                    } SWC`,
                                },
                                {
                                    name: "Their new balance",
                                    value: `${
                                        docSnap_recip.data()?.balance
                                    } SWC`,
                                }
                            ],
                        },
                    ],
                });
            } else {
                msg.channel.send(
                    "Transaction failed. Has the recipient initialized a wallet with **!wallet** yet?"
                );
            }
        } else {
            msg.channel.send(
                "Transaction failed. Have you initialized a wallet with **!wallet** yet?"
            );
        }
    })();
};
