module.exports = async(client, msg, suffix, call) => {
	if ((call.to.number === "08006113835" || call.from.number === "08006113835") && msg.channel.id != config.supportChannel) return;
	if (!call.pickedUp) msg.reply(":x: You can't put a call on hold that hasn't been picked up");

	if (call.onHold) {
		if (call.onHold != msg.channel.id) return msg.reply(":x: Only the other side can release this hold.");
		call.onHold = "";
		await client.apiSend(":hourglass: The hold has ended.", msg.channel.id === call.from.channel ? call.to.channel : call.from.channel);
		await msg.reply(":hourglass: You have ended the call hold.");
	} else {
		call.onHold = msg.channel.id;
		await msg.reply(":hourglass_flowing_sand: You have put this call on hold. Re-do `>hold` to release.");
		await client.apiSend(":hourglass_flowing_sand: The other side has put this call on hold.", call.onHold === call.from.channel ? call.to.channel : call.from.channel);
		// add stop typing
	}
	await r.table("Calls").get(call.id).update(call);
};
