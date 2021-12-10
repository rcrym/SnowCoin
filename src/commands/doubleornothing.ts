import { Message } from "discord.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { userIDToWalletID } from "../helpers";

export const double_or_nothing_command = (msg: Message) => {
    (async () => {
        const docRef_payer = doc(db, "users", msg.author.id);
        var docSnap_payer = await getDoc(docRef_payer);
        let repeat = parseFloat(msg.content.split("repeat ")[1]);
        if (repeat <= 0) {
            msg.channel.send("Repeat value must be greater than zero.");
            return;
        }
        if (msg.content.split(" ").length < 2) {
            msg.channel.send("No risk amount provided.");
            return;
        }
        const risk = parseFloat(msg.content.split(" ")[1]);
        if (!risk || risk <= 0) {
            msg.channel.send("You must risk more than 0 SWC.");
            return;
        }
        for (let i = 0; i < repeat; i++) {
            var balance = docSnap_payer.data()?.balance;

            if (risk > balance) {
                msg.channel.send("You don't have that much money to risk.");
                return;
            }

            var earning = Math.random() < 0.5 ? risk : -1 * risk;
            const won = earning > 0;
            if (balance + earning < 0) {
                earning = balance * -1;
            }

            await setDoc(
                doc(db, "users", msg.author.id),
                {
                    balance: balance + earning,
                },
                { merge: true }
            );
            docSnap_payer = await getDoc(docRef_payer);

            if (won) {
                msg.channel.send({
                    embeds: [
                        {
                            title: `**${earning} SWC** won by ${msg.author.username}`,
                            description: `Deposited into ${userIDToWalletID(
                                docRef_payer.id
                            )}`,
                            color: 5295948,
                            thumbnail: {
                                url: `${msg.author.displayAvatarURL()}`,
                            },
                            fields: [
                                {
                                    name: "Your new balance",
                                    value: `${
                                        docSnap_payer.data()?.balance
                                    } SWC`,
                                },
                            ],
                        },
                    ],
                });
            } else {
                msg.channel.send({
                    embeds: [
                        {
                            title: `**${earning * -1} SWC** lost by ${
                                msg.author.username
                            }`,
                            description: `Withdrawn from ${userIDToWalletID(
                                docRef_payer.id
                            )}`,
                            color: 14564410,
                            thumbnail: {
                                url: `${msg.author.displayAvatarURL()}`,
                            },
                            fields: [
                                {
                                    name: "Your new balance",
                                    value: `${
                                        docSnap_payer.data()?.balance
                                    } SWC`,
                                },
                            ],
                        },
                    ],
                });
            }
        }
    })();
};
