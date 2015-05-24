//ranking is mostly arbitrary
var Groupsranking = [' ', 'T', 'L', 'S', 'P', 'F', 'ß', 'T','C','α'];
var Groups = {
        'α': {
        	id: "ace",
        	name: "Ace",
        	rank:9
        },
        'C': {
                id: "champion",
                name: "Champion",
                rank: 8
        },
        'T': {
                id: "rg",
                name: "Royal Guard",
                rank: 7
        },
        'ß': {
                id: "brain",
                name: "Frontier Brain",
                rank: 6
        },
        'F': {
                id: "frontier",
                name: "Frontier",
                rank: 5
        },
        'P': {
                id: "professor",
                name: "Professor",
                rank: 4
        },
        'S': {
                id: "elite",
                name: "Elite",
                rank: 3
        },
        'L': {
                id: "gleader",
                name: "Gym Leader",
                rank: 2
        },
        'T': {
                id: "trainer",
                name: "Gym Trainer",
                rank: 1
        },
        ' ': {
                rank: 0
        }
}

exports.commands = {
        leaguedeauth: 'leaguepromote',
        roomtrainer: 'leaguepromote',
        roomgleader: 'leaguepromote',
        roomelite: 'leaguepromote',
        roombrain: 'leaguepromote',
        roomfrontier: 'leaguepromote',
        roomchampion: 'leaguepromote',
        roomrg: 'leaguepromote',
        roomprofessor: 'leaguepromote',
        roomace: 'leaguepromote',
        leaguedemote: 'leagueauth',
        leaguepromote: function (target, room, user, connection, cmd) {
                if (!room.auth) {
                        this.sendReply("/leagueauth - This room isn't designed for per-room moderation");
                        return this.sendReply("Before setting league staff, you need to set it up with /roomfounder");
                }
                if (!target) return this.parse('/leagueauth [user] - Giver a user a rank in a league.');
                if (!this.can('roommod', null, room)) return false;

                target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var userid = toId(this.targetUsername);
                var name = targetUser ? targetUser.name : this.targetUsername;

                if (!userid) return this.parse('/leagueauth [user] - Giver a user a rank in a league.');
                if (!targetUser && (!room.auth || !room.auth[userid])) {
                        return this.sendReply("User '" + name + "' is offline and unauthed, and so can't be promoted.");
                }

                var currentGroup = ((room.leagueauth&& room.leagueauth[userid]) || ' ')[0];
                var nextGroup = target || Users.getNextGroupSymbol(currentGroup, cmd === 'leaguedemote', true);
                if (target === 'deauth') nextGroup = Groupsranking[0];
               
                if (cmd==='roomtrainer') {
                        nextGroup = Groupsranking[1];
                } else if (cmd==='roomgleader') {
                        nextGroup = Groupsranking[2];
                } else if (cmd==='roomelite') {
                        nextGroup = Groupsranking[3];                
                } else if (cmd==='roomprofessor') {
                        nextGroup = Groupsranking[4];
                } else if (cmd==='roomfrontier') {
                        nextGroup = Groupsranking[5];
                } else if (cmd==='roombrain') {
                        nextGroup = Groupsranking[6];
                } else if (cmd==='roomrg') {
                        nextGroup = Groupsranking[7];
                } else if (cmd==='roomchampion') {
                        nextGroup = Groupsranking[8];
                } else if (cmd==='leaguedeauth') {
                        nextGroup = Groupsranking[0];
                }
		
		if (!Groups[nextGroup]) {
                        return this.sendReply("Group '" + nextGroup + "' does not exist.");
                }

                var groupName = Groups[nextGroup].name || "regular user";
                if (currentGroup === nextGroup) {
                        return this.sendReply("User '" + name + "' is already a " + groupName + " in this room.");
                }

                if (nextGroup === ' ') {
                        delete room.leagueauth[userid];
                } else {
                        room.leagueauth[userid] = nextGroup;
                }

                if (Groups[nextGroup].rank < Groups[currentGroup].rank) {
                        this.privateModCommand("(" + name + " was changed to " + groupName + " by " + user.name + ".)");
                        if (targetUser && Rooms.rooms[room.id].users[targetUser.userid]) targetUser.popup("You were changed to " + groupName + " by " + user.name + ".");
                } else {
                        this.addModCommand("" + name + " was changed to " + groupName + " by " + user.name + ".");
                }

                if (targetUser) targetUser.updateIdentity(room.id);
                if (room.chatRoomData) Rooms.global.writeChatRoomData();
        },
	leagueauth: function (target, room, user, connection) {
		var targetRoom = room;
		if (target) targetRoom = Rooms.search(target);
		if (!targetRoom || (targetRoom !== room && targetRoom.modjoin && !user.can('bypassall'))) return this.sendReply("The room '" + target + "' does not exist.");
		if (!targetRoom.auth) return this.sendReply("/roomauth - The room '" + (targetRoom.title ? targetRoom.title : target) + "' isn't designed for per-room moderation and therefore has no auth list.");

		var rankLists = {};
		for (var u in targetRoom.leagueauth) {
			if (!rankLists[targetRoom.leagueauth[u]]) rankLists[targetRoom.leagueauth[u]] = [];
			rankLists[targetRoom.leagueauth[u]].push(u);
		}

		var buffer = [];
		Object.keys(rankLists).sort(function (a, b) {
			return (Groups[b] || {rank:0}).rank - (Groups[a] || {rank:0}).rank;
		}).forEach(function (r) {
			buffer.push((Groups[r] ? Groups[r] .name + "s (" + r + ")" : r) + ":\n" + rankLists[r].sort().join(", "));
		});

		if (!buffer.length) {
			connection.popup("The room '" + targetRoom.title + "' has no league auth.");
			return;
		}
		if (targetRoom !== room) buffer.unshift("" + targetRoom.title + " room auth:");
		connection.popup(buffer.join("\n\n"));
	},
}
