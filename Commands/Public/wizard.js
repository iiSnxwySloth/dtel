const { MessageEmbed } = require("discord.js");
const { numberIsValid } = require("../../Internals/modules");

module.exports = async(client, msg, suffix) => {
	let myNumber = await msg.channel.number;
	if (myNumber) return msg.channel.send({ embed: { color: config.colors.error, title: "Registry error", description: "This channel already has a number. Call `*611` if you want to change/remove it." } });

	if (msg.guild && !await msg.guild.whitelisted) {
		let guildNumbers = await msg.guild.numbers;
		if (guildNumbers.length >= config.maxNumbers) return msg.channel.send({ embed: { color: config.colors.error, title: "Too many numbers", description: `You have reached the maximum amount of ${config.maxNumbers} numbers per guild.\n\nIf you have a good use for more numbers (eg. roleplaying server), please [contact our staff](${config.guildInvite}) to get whitelisted.`, footer: { text: "This limit was set to prevent trolling" } } });
	}

	let perm = msg.channel.type === "dm" ? true : await msg.guild.members.cache.get(msg.author.id).hasPermission("MANAGE_GUILD");
	if (!perm) perm = msg.author.support;
	if (!perm) return msg.channel.send({ embed: { color: config.colors.error, title: "Permission error", description: "You need to have `manage guild` permission to run this command." } });

	let prefix = msg.channel.type == "dm" ? "0900" : `030${client.shard.id + 1}`;
	let toChoose = true;
	msg.author.busy = true;

	let embed = new MessageEmbed()
		.setColor(config.colors.info)
		.setTitle("Read this information before proceeding.")
		.addField(
			"This is a roleplay bot!",
			"In case you haven't noticed, this is a roleplay bot used to simulate a telephone system between Discord channels, which means it **cannot call real numbers!**",
		)
		.addField(
			"Documentation and TOS",
			`The documentation is located at ${config.siteLink}. **Please read it** as it contains important information, like DTel's [Privacy Policy](https://dtel.austinhuang.me/en/latest/Privacy/).`,
		)
		.addField(
			"Payment",
			`To keep using your number, you must renew it each month. The number will cost **${config.renewalRate}** credits (the bot's currency) per month. Don't worry, the first month is free! Renewals can be automatically performed (from the SERVER OWNER's account) or through \`>dial *233\`. See [here](https://dtel.austinhuang.me/en/latest/Payment/) for ways to get credits. **No IRL purchase is required to use this bot or renew your number!**`,
		)
		.addField(
			"I'm done reading!",
			`**Please enter seven (7) digits or letters for your number in <#${msg.channel.id}>.** Note: your number will start with the default prefix (${prefix}) followed by the seven digits (letters will be converted) of your choice. Type \`0\` to quit the wizard.`,
		);

	let omsg = await msg.channel.send({ embed: embed });

	let number,
		expiryDate,
		description;

	// NUMBER
	let numberChooser = async() => {
		let collector = await msg.channel.awaitMessages(
			m => m.author.id === msg.author.id,
			{
				max: 1,
				time: 2 * 60 * 1000,
			},
		);

		let collected = collector.first();
		if (!collected) {
			msg.author.busy = false;
			return msg.channel.send({ embed: { color: config.colors.error, title: "Timed out", description: "Wizard expired. Please run `>wizard` again when you have a number ready." } });
		}
		if (collected.content == "0") {
			msg.author.busy = false;
			return omsg.edit({ embed: { color: config.colors.error, title: "Goodbye", description: "Exiting wizard..." } }).catch(e => msg.channel.send({ embed: { color: config.colors.error, title: "Goodbye", description: "Exiting wizard..." } }));
		}

		number = await numberIsValid(msg.channel, prefix + collected.content);
		if (!number) {
			msg.channel.send({ embed: { color: config.colors.error, title: "Invalid number", description: "Please enter **seven** (7) digits or letters." } });
			return numberChooser();
		}

		let existingNumber = await r.table("Numbers").get(number);
		if (existingNumber) {
			msg.channel.send({ embed: { color: config.colors.error, title: "Existing number", description: "Sorry,that number already exists. Try something else!" } });
			return numberChooser();
		}

		expiryDate = new Date();
		expiryDate.setMonth(expiryDate.getMonth() + 1);

		let numberDoc = {
			id: number,
			channel: msg.channel.id,
			expiry: expiryDate,
			createdAt: new Date(),
		};
		if (msg.channel.type != "dm") numberDoc.guild = msg.channel.guild.id;
		numberDoc.owner = msg.channel.type != "dm" ? msg.guild.ownerID : msg.author.id;

		await r.table("Numbers").insert(numberDoc);
		await client.log(`:blue_book: Number \`${number}\` has been self-assigned to channel ${numberDoc.channel} by ${msg.author.tag} (${msg.author.id})`);
		await msg.channel.send({ embed: { color: config.colors.info, title: "Registered!", description: `This channel's number is now ${number}.`, fields: [{ name: "Phonebook", value: `You can also put your number in the public phonebook, meaning this number can be randomly called (\`>rcall\`).\nIf you want to do so, type a description for your number (**no explicit language**), otherwise type \`skip\`.` }] } });
		return phonebookChooser();
	};

	// PHONEBOOK

	let phonebookChooser = async() => {
		let collector = await msg.channel.awaitMessages(
			m => m.author.id == msg.author.id,
			{
				max: 1,
				time: 5 * 60 * 1000,
			},
		);

		let collected = collector.first();
		if (!collected) {
			msg.author.busy = false;
			return msg.channel.send({ embed: { color: config.colors.info, title: "Timed out", description: "Wizard timed out. Please call `*411` if you want to set a phonebook description." } });
		}
		if (collected.content.startsWith(config.prefix)) {
			msg.author.busy = false;
			return;
		}
		if (collected.content === "skip") {
			return embedSender();
		} else {
			description = collected.content.replace(/[~_`*]/g, "\\$1");

			let min = 15;
			let max = 500;
			let l = description.length;
			if (min > l || l > max) {
				await msg.channel.send({ embed: { color: config.colors.error, title: "Length", description: `Please ${min > l ? "add to" : "shorten"} your description to match the ${min > l ? "min" : "max"} of **${min > l ? min : max}** characters and try again.` } });
				return phonebookChooser();
			}

			let phonebookDoc = {
				id: number,
				channel: msg.channel.id,
				description: description,
			};

			await r.table("Phonebook").insert(phonebookDoc);
			return embedSender();
		}
	};

	// INFORMATION

	let embedSender = async() => {
		embed = new MessageEmbed()
			.setColor(config.colors.receipt)
			.setTitle("Your number is all set up!")
			.setDescription("Here's all the info about your number. If you have any questions or want to report any abuse of DTel (eg. a troll call), please call `*611`! (Pro tip: **you can check your number by dialling *233!**)")
			.addField(
				"What now?",
				`To learn more about the bot: \`>help\`, \`>info\`, \`>links\`.\nFor information about (your) number(s): call \`*233\` and \`*411\` (where you can also find numbers to call!).`,
			)
			.addField(
				"Number",
				`${number}`,
				true,
			)
			.addField(
				"Expires on",
				`${expiryDate}`,
				true,
			)
			.setFooter("The wizard has been completed.");
		if (description) {
			embed.addField(
				"Phonebook description",
				`${description}`,
				true,
			);
		}

		msg.author.busy = false;
		await msg.channel.send({ embed: embed });
	};

	return numberChooser();
};
