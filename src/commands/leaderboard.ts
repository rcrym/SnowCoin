import { getDocs, collection, query } from "@firebase/firestore";
import { db } from "../firebase";
import { sleep } from "../helpers";
import { Message } from "discord.js";
import { limit, orderBy } from "firebase/firestore";
import axios from "axios";
import { Coin } from "../types/coin";


export const leaderboard_command = async (msg: Message) => {
  msg.channel.send("Fetching current crypto prices and generating leaderboard... This make take some time.");

    let userRef = collection(db, "users");

    const q = query(userRef, orderBy("balance", "desc"), orderBy("name"), limit(10));

    const querySnapshot = await getDocs(q);
  let leaderboard: any = [];
  
  querySnapshot.forEach(async (doc) => {
    
    let userData = doc.data();

        // doc.data() is never undefined for query doc snapshots

      
      
      
      
    let total = userData.balance;
        // console.log(pruned_snap?.investments);
        if (userData.investments && userData.investments.length > 0) {

            for (let investment of userData.investments) {
                let { data } = await axios.get(
                    `https://api.nomics.com/v1/currencies/ticker?key=${process.env.STOCK_TOKEN}&ids=${investment.symbol}`
                );
                let coin: Coin = data[0];
                // coin.symbol = coin.id;
                // let obj = {
                //     name: investment.symbol,
                //     value: `${investment.coins_owned} (equal to ${
                //         parseFloat(investment.coins_owned) *
                //         parseFloat(coin.price)
                //     } SWC)`,
                // };
                total += parseFloat(coin.price) * investment.coins_owned;
                // console.log(obj);
                // investments_fields.push(obj);
                if(userData.investments.length > 1) await sleep(500);
            }
        }
        leaderboard.push({
          name: userData.name,
          balance: total,
      });
        // console.log(doc.id, " => ", doc.data());
    });

    var embed_fields = [];
    for (let index in leaderboard) {
        let obj = {
            name: (parseInt(index) + 1)+"",
            value: `${leaderboard[index].name} - ${leaderboard[index].balance}`,
        };
      embed_fields.push(obj)
    }

    msg.channel.send({
        embeds: [
            {
                title: `Leaderboard`,
                description: `Ranked by total networth`,
                color: 3184310,
                // thumbnail: {
                //     url: `${user?.displayAvatarURL()}`,
                // },
                fields: embed_fields,
            },
        ],
    });

    // const querySnapshot = await getDocs(collection(db, "users"));

    // let leaderboard = querySnapshot.map(doc => )
};
