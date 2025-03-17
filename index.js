/// <reference types="../CTAutocomplete" />

import PogObject from "../PogData";
import Dungeon from "../BloomCore/dungeons/Dungeon";
import Skyblock from "../BloomCore/Skyblock";
import { registerWhen } from "../BloomCore/utils/Utils";

const S02PacketChat = Java.type("net.minecraft.network.play.server.S02PacketChat");
const C0EPacketClickWindow = Java.type("net.minecraft.network.play.client.C0EPacketClickWindow");

const chestData = new PogObject("bigkismet", {
    chests: []
}, "chests.json");

let runDone = false;
let doSearch = true;
let clickIndex;


register("worldLoad", () => {
    runDone = false;
    doSearch = true;
    bigChests = {};
    chestData.chests = chestData.chests.filter(c => isRecent(c.time));
});


register("packetReceived", (packet, event) => {
    if (packet.func_148916_d() || runDone) {
        return;
    }

    const chatComponent = packet.func_148915_c();
    const text = new String(chatComponent.func_150254_d().removeFormatting());

    if (!text?.match(/\s+☠ Defeated (.+) in (\d+)m\s+(\d+)s/)) return;

    runDone = true;
    chestData.chests.unshift({time: Date.now(), rerolled: false});
    chestData.save();
}).setFilteredClass(S02PacketChat);


registerWhen(register("packetSent", (packet, event) => {
    let item = packet?.func_149546_g();
    if (!item) return;

    item = new Item(item);

    clickIndex = getClickIndex(packet.func_149544_d());

    if (item?.getName()?.includes("Reroll Chest")) {
        if (Dungeon.inDungeon && !runDone) return;

        if (Dungeon.inDungeon) {
            clickIndex = 0;
        }
    
        chestData.chests = chestData.chests.filter(c => isRecent(c));
        if (!chestData?.chests?.[clickIndex]) return;
        chestData.chests[clickIndex].rerolled = true;
        chestData.save();
    }
}).setFilteredClass(C0EPacketClickWindow), () => Dungeon.inDungeon || Skyblock.area == "Dungeon Hub");

const getClickIndex = (n) => { // 10 - 16 >> 17 18 >> 19 - 25 >> 26 27 >> 28 29
    n -= 10;
    n -= (2 * (n > 7 ? Math.floor(n / 7) : 0));
    return n;
}

// let bigChests = {};
let kismetSlots = new Set();
let openedChests = new Set();
let halfOpened = new Set();

registerWhen(register("renderSlot", (slot, gui, event) => {
    let item = slot?.getItem();
    if (!item) return;

    if (Player?.getContainer()?.getName() != "Croesus") return;
    let slotInfo = kismetSlots.has(getClickIndex(slot.getIndex()));
    if (slotInfo) {
        const x = slot.getDisplayX();
        const y = slot.getDisplayY();
        
        Renderer.drawRect(Renderer.color(79, 165, 222, 127), x, y, 16, 16);
    }
    
    if (openedChests.has(slot.getIndex())) {
        cancel(event);
    } else if (halfOpened.has(slot.getIndex())) {
        const x = slot.getDisplayX();
        const y = slot.getDisplayY();
        
        Renderer.drawRect(Renderer.color(218, 206, 55, 127), x, y, 16, 16);
    }
}), () => Skyblock.area ==  "Dungeon Hub");


// register("step", () => {
    // console.log(`${Object.keys(bigChests)} >> ${clickIndex}`);
// }).setFps(1);


registerWhen(register("tick", () => {
    if (Player?.getContainer()?.getName() != "Croesus") return;

    let itemList = Player.getContainer().getItems();
    let tempChests = new Set();
    let tempOpenChests = new Set();
    let tempHalfOpened = new Set();

    let b = 0;
    for (let i = 0; i < itemList.length; i++) {
        let item = itemList[i];
        if (!item?.getName()?.match(/.*The Catacombs/)) {
            continue;
        }
        let tc = chestData.chests?.[b];
        if (tc && !tc.rerolled) {
            tempChests.add(b);
        } else {
            let lore = item.getLore();
            let isOpened = lore.some(l => l.removeFormatting().includes("No more Chests to open!"));
            if (isOpened) tempOpenChests.add(i);
            let canKey = lore.some(l => l.removeFormatting().includes("Opened Chest: "));
            if (canKey) tempHalfOpened.add(i);
        }

        // if (!tc) continue;
        // if (!tc.rerolled) 
        
        // tempChests[b] = tc.rerolled;
        b++;
    }
    kismetSlots = tempChests;
    openedChests = tempOpenChests;
    halfOpened = tempHalfOpened;
}), () => Skyblock.area == "Dungeon Hub");


const isRecent = (time) => {
    return Date.now() - time < 172800000;
}
