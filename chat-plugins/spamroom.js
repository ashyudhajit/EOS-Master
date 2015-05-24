var fs = require('fs');

fs.readFile('./config/ipbans.txt', function (err, data) {
 			Users.bannedIps[data[i]] = '#ipban';
 		}
 	};
 	Users.checkRangeBanned = Cidr.checker(rangebans);
 });

global.Spamroom = require('./spamroom.js');

var commands = exports.commands = {
 		target = this.canTalk(target, null);
 		if (!target) return false;
 
 		var message = '|pm|' + user.getIdentity() + '|' + targetUser.getIdentity() + '|' + target;
 		user.send(message);
		if (targetUser !== user) {
			if (Spamroom.isSpamroomed(user)) {
				Spamroom.room.add('|c|' + user.getIdentity() + "|__(Private to " + targetUser.getIdentity() + ")__ " + target);
			} else {
				targetUser.send(message);
			}
		}
 		targetUser.lastPM = user.userid;
 		user.lastPM = targetUser.userid;
 	},
 
 	blockpm: 'ignorepms',
    var commands = exports.commands = {
 		// secret sysop command
 		room.add(target);
 	},
 
 	/*********************************************************
	 * Custom commands
	 *********************************************************/

	spam: 'spamroom',
	spamroom: function (target, room, user) {
		if (!target) return this.sendReply("Please specify a user.");
		this.splitTarget(target);

		if (!this.targetUser) {
			return this.sendReply("The user '" + this.targetUsername + "' does not exist.");
		}
		if (!this.can('mute', this.targetUser)) {
			return false;
		}

		var targets = Spamroom.addUser(this.targetUser);
		if (targets.length === 0) {
			return this.sendReply("That user's messages are already being redirected to the spamroom.");
		}
		this.privateModCommand("(" + user.name + " has added to the spamroom user list: " + targets.join(", ") + ")");
	},

	unspam: 'unspamroom',
	unspamroom: function (target, room, user) {
		if (!target) return this.sendReply("Please specify a user.");
		this.splitTarget(target);

		if (!this.can('mute')) {
			return false;
		}

		var targets = Spamroom.removeUser(this.targetUser || this.targetUsername);
		if (targets.length === 0) {
			return this.sendReply("That user is not in the spamroom list.");
		}
		this.privateModCommand("(" + user.name + " has removed from the spamroom user list: " + targets.join(", ") + ")");
	},

	/*********************************************************
 	 * Help commands
 	 *********************************************************/
 
 	commands: 'help',
 	h: 'help',
    var BattleRoom = (function () {
 		// room.decision(), where room.constructor === BattleRoom.
 
 		message = CommandParser.parse(message, this, user, connection);
 
 		if (message) {
			if (Spamroom.isSpamroomed(user)) {
				Spamroom.room.add('|c|' + user.getIdentity() + "|__(To " + this.id + ")__ " + message);
				connection.sendTo(this, '|chat|' + user.name + '|' + message);
			} else {
				this.battle.chat(user, message);
			}
 		}
 		this.update();
 	};
 	BattleRoom.prototype.logEntry = function () {};
 	BattleRoom.prototype.expire = function () {
@@ -1493,11 +1498,16 @@ var ChatRoom = (function () {
 	};
 	ChatRoom.prototype.chat = function (user, message, connection) {
 		message = CommandParser.parse(message, this, user, connection);
 
 		if (message) {
			if (Spamroom.isSpamroomed(user)) {
				Spamroom.room.add('|c|' + user.getIdentity() + "|__(To " + this.id + ")__ " + message);
				connection.sendTo(this, '|c|' + user.getIdentity(this.id) + '|' + message);
			} else {
				this.add('|c|' + user.getIdentity(this.id) + '|' + message, true);
			}
 		}
 		this.update();
 	};
 	ChatRoom.prototype.logEntry = function () {};
 	ChatRoom.prototype.destroy = function () {
var spamroom = Rooms.get('spamroom');
if (!spamroom) {
	Rooms.global.addChatRoom('Spam Room');
	spamroom = Rooms.get('spamroom');
	spamroom.isPrivate = true;
	spamroom.staffRoom = true;
	if (spamroom.chatRoomData) {
		spamroom.chatRoomData.isPrivate = true;
		spamroom.chatRoomData.staffRoom = true;
		spamroom.addedUsers = spamroom.chatRoomData.addedUsers = {};
		Rooms.global.writeChatRoomData();
	} else {
		spamroom.addedUsers = {};
	}
}
if (Object.size(spamroom.addedUsers) > 0)
	spamroom.add("||Loaded user list: " + Object.keys(spamroom.addedUsers).sort().join(", "));
exports.room = spamroom;

function getAllAlts(user) {
	var targets = {};
	if (typeof user === 'string')
		targets[toId(user)] = 1;
	else
		user.getAlts().concat(user.name).forEach(function (alt) {
			targets[toId(alt)] = 1;
			Object.keys(Users.get(alt).prevNames).forEach(function (name) {
				targets[toId(name)] = 1;
			});
		});
	return targets;
}

exports.addUser = function (user) {
	var targets = getAllAlts(user);
	for (var u in targets)
		if (spamroom.addedUsers[u])
			delete targets[u];
		else
			spamroom.addedUsers[u] = 1;
	Rooms.global.writeChatRoomData();

	targets = Object.keys(targets).sort();
	if (targets.length > 0)
		spamroom.add("||Added users: " + targets.join(", "));
	return targets;
};

exports.removeUser = function (user) {
	var targets = getAllAlts(user);
	for (var u in targets)
		if (!spamroom.addedUsers[u])
			delete targets[u];
		else
			delete spamroom.addedUsers[u];
	Rooms.global.writeChatRoomData();

	targets = Object.keys(targets).sort();
	if (targets.length > 0)
		spamroom.add("||Removed users: " + targets.join(", "));
	return targets;
};

exports.isSpamroomed = function (user) {
	var targets = getAllAlts(user);
	if (Object.keys(targets).intersect(Object.keys(spamroom.addedUsers)).length === 0)
		return false;

	var addedUsers = {};
	Array.prototype.exclude.apply(Object.keys(targets), Object.keys(spamroom.addedUsers)).forEach(function (user) {
		if (spamroom.addedUsers[user])
			return;
		spamroom.addedUsers[user] = addedUsers[user] = 1;
	});

	if (Object.size(addedUsers) > 0) {
		Rooms.global.writeChatRoomData();
		spamroom.add("||Alts automatically added: " + Object.keys(addedUsers).sort().join(", "));
	}

	return true;
};
