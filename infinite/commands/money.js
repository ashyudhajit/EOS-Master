var Q = require('q');
var Economy = require('../economy');
var User = require('../mongo').userModel;
var fs = require('fs');

var shop = [
    ['Symbol', 'Buys a custom symbol to go infront of name and puts you at top of userlist. (Temporary until restart, certain symbols are blocked)', 5],
    ['Fix', 'Buys the ability to alter your current custom avatar or trainer card. (don\'t buy if you have neither)', 10],
    ['PM', 'Send a message to everyone on the server. [Can be refused] (Everyone on the server will receive a message from "~Server PM - [Do not reply] Uses: League Advertisements, Celebrations, ETC', 20],
    ['Avatar', 'Buys an custom avatar to be applied to your name (You supply. Images larger than 80x80 may not show correctly)', 50],
    ['Declare', 'Globally declare a message to the whole server! [Can be refused](A small blue message that every chatroom can see; Uses: League Advertisements, Celebrations, ETC)', 50],
    ['Trainer', 'Buys a trainer card which shows information through a command. (You supply, can be refused)', 50],
    ['Room', 'Buys a chatroom for you to own. (within reason, can be refused)', 100],
    ['Tacosaur', 'Your name gets added to /tacosaur.', 150],
    ['Félicette', 'Backdoor Access: Félicette! Back by popular demand!', 300]
];

var shopDisplay = getShopDisplay(shop);

module.exports = {
    atm: 'wallet',
    purse: 'wallet',
    wallet: function(target, room, user) {
        if (!this.canBroadcast()) return;
        if (!target) target = user.name;
        Economy.get(target).then(function(amount) {
            this.sendReplyBox(Tools.escapeHTML(target) + ' has ' + amount + Economy.currency(amount) + '.');
            room.update();
        }.bind(this));
    },

    givebuck: 'givemoney',
    givebucks: 'givemoney',
    givemoney: function(target, room, user) {
        if (!user.can('givemoney')) return this.sendReply('/givemoney - Access denied.');
        if (!target || target.indexOf(',') < 0) {
            return this.sendReply('/givemoney [user], [amount] - Give a user a certain amount of money.');
        }

        var parts = target.split(',');
        this.splitTarget(parts[0]);
        var amount = Number(parts[1].trim());
        var currency = amount + Economy.currency(amount);

        if (!this.targetUser) return this.sendReply('User ' + this.targetUsername + ' not found.');
        if (isNaN(parts[1])) return this.sendReply('Must be a number.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('Cannot contain a decimal.');
        if (amount < 1) return this.sendReply('You can\'t give less than one' + Economy.currency(amount));

        Economy.give(this.targetUsername, amount).then(function(total) {
            this.sendReply(this.targetUsername + ' was given ' + currency  + '. This user now has ' + total + Economy.currency(total) + '.');
            Users.get(this.targetUsername).connections[0].sendTo(room.id, user.name + ' has given you ' + currency + '. You now have ' + total + Economy.currency(total) + '.');
        }.bind(this));
    },

    takebuck: 'takemoney',
    takebucks: 'takemoney',
    takemoney: function(target, room, user) {
        if (!user.can('takemoney')) return this.sendReply('/takemoney - Access denied.');
        if (!target || target.indexOf(',') < 0) {
            return this.sendReply('/takemoney [user], [amount] - Take a certain amount of money from a user.'); 
        }

        var parts = target.split(',');
        this.splitTarget(parts[0]);
        var amount = Number(parts[1].trim());
        var currency = amount + Economy.currency(amount);

        if (!this.targetUser) return this.sendReply('User ' + this.targetUsername + ' not found.');
        if (isNaN(parts[1])) return this.sendReply('Must be a number.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('Cannot contain a decimal.');
        if (amount < 1) return this.sendReply('You can\'t give less than one' + Economy.currency(amount));

        Economy.take(this.targetUsername, amount).then(function(total) {
            this.sendReply(this.targetUsername + ' losted ' + currency + '. This user now has ' + total + Economy.currency(total) + '.');
            Users.get(this.targetUsername).send(user.name + ' has taken ' + currency + ' from you. You now have ' + total + Economy.currency(total) + '.');
        }.bind(this));
    },

    transfer: 'transfermoney',
    transferbuck: 'transfermoney',
    transferbucks: 'transfermoney',
    transfermoney: function(target, room, user) {
        if (!target || target.indexOf(',') < 0) {
            return this.sendReply('/transfer [user], [amount] - Transfer a certain amount of money to a user.');
        }

        var parts = target.split(',');
        var amount = Number(parts[1].trim());
        var targetName = parts[0];
        var currency = amount + Economy.currency(amount);

        if (toId(targetName) === user.userid) return this.sendReply('You cannot transfer to yourself.');
        if (isNaN(parts[1])) return this.sendReply('Must be a number.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('Cannot contain a decimal.');
        if (amount < 1) return this.sendReply('You can\'t give less than one' + Economy.currency(amount));

        var self = this;
        Economy.get(user.name)
            .then(function(money) {
                if (amount > money) return self.sendReply('You cannot transfer more money than what you have.');
                return [Economy.give(targetName, amount), Economy.take(user.name, amount)];
            })
            .spread(function(targetTotal, userTotal) {
                self.sendReply('You have successfully transferred ' + currency + '. You now have ' + userTotal + Economy.currency(userTotal) + '.');
                if (Users.get(targetName)) {
                    Users.get(targetName).connections[0].sendTo(room.id, user.name + ' has transferred ' + currency + '. You now have ' + targetTotal + Economy.currency(targetTotal) + '.');
                }
            }, function(err) {
                if (err) console.error(err);
            }).done();
    },
	
	roomshop: 'leagueshop',
	leagueshop: function(target, room, user) {
	 /*	if (!room.isLeague) return this.sendReply('/leagueshop - This room is not a league.'); */
	 	if (!room.founder) return this.sendReply('/leagueshop - league shops require a room founder.');
	 	if (!room.shopList) room.shopList = [];
	 	if (!target) var target = '';
	 	var self = this;
 
		var cmdParts = target.split(' ');
		var cmd = cmdParts.shift().trim().toLowerCase();
		var params = cmdParts.join(' ').split(',').map(function (param) { return param.trim(); });
 
	 	switch (cmd) {
	 		case 'list':
	 		case 'view':
	 		default:
	 			if (!this.canBroadcast()) return;
	 			if (room.shopList.length < 1) return this.sendReplyBox('<center><b><u>This shop has no items!</u></b></center>');
	 			var output = '<center><h4><b><u><font color="#24678d">' + Tools.escapeHTML(room.title) + '\'s Shop</font></u></b></h4><table border="1" cellspacing ="0" cellpadding="3"><tr><th>Item</th><th>Description</th><th>Price</th></tr>';
	 			for (var u in room.shopList) {
					if (!room.shop[room.shopList[u]] || !room.shop[room.shopList[u]].name || !room.shop[room.shopList[u]].description || !room.shop[room.shopList[u]].price) continue;
	 				output += '<tr><td><button name="send" value="/leagueshop buy ' + Tools.escapeHTML(room.shopList[u]) + '" >' + Tools.escapeHTML(room.shop[room.shopList[u]].name) +
	 				'</button></td><td>' + Tools.escapeHTML(room.shop[room.shopList[u]].description.toString()) + '</td><td>' + room.shop[room.shopList[u]].price + '</td></tr>';
	 			}
	 			output += '</center><br />';
	 			this.sendReplyBox(output);
	 			break;
	 		case 'add':
	 			if (!user.can('roommod', null, room)) return this.sendReply('/leagueshop - Access denied.');
	 			if (params.length < 3) return this.sendReply('Usage: /leagueshop add [item name], [description], [price]');
	 			if (!room.shopList) room.shopList = [];
	 			var name = params.shift();
	 			var description = params.shift();
	 			var price = Number(params.shift());
	 			if (isNaN(price)) return this.sendReply('Usage: /leagueshop add [item name], [description], [price]');
	 			var bucks = 'bucks';
	 			if (Number(price) < 2) bucks = 'buck';
	 			room.shop[toId(name)] = new Object();
	 			room.shop[toId(name)].name = name;
	 			room.shop[toId(name)].description = description;
	 			room.shop[toId(name)].price = price;
	 			room.shopList.push(toId(name));
	 			room.chatRoomData.shop = room.shop;
	 			room.chatRoomData.shopList = room.shopList;
	 			Rooms.global.writeChatRoomData();
	 			this.sendReply('Added "' + name + '" to the league shop for ' + price + ' ' + ((price === 1) ? " buck." : " bucks.") + '.');
	 			break;
	 		case 'remove':
	 		case 'rem':
	 		case 'del':
	 		case 'delete':
	 			if (!user.can('roommod', null, room)) return this.sendReply('/leagueshop - Access denied.');
	 			if (params.length < 1) return this.sendReply('Usage: /leagueshop delete [item name]');
	 			var item = params.shift();
	 			if (!room.shop[toId(item)]) return this.sendReply('/leagueshop - Item "'+item+'" not found.');
	 			delete room.shop[toId(item)];
	 			var index = room.shopList.indexOf(toId(item));
				if (index > -1) {
				    room.shopList.splice(index, 1);
				}
				this.sendReply('Removed "' + item + '" from the league shop.');
				break;
			case 'buy':
				if (params.length < 1) return this.sendReply('Usage: /leagueshop buy [item name]');
				var item = params.shift();
				if (!room.shop[toId(item)]) return this.sendReply('/leagueshop - Item "'+item+'" not found.');
				Economy.get(user.userid).then(function(money) {
					if (money < room.shop[toId(item)].price) return self.sendReply('You don\'t have enough bucks to purchase a '+item+'. You need '+ ((money - room.shop[toId(item)].price) * -1) + ' more bucks.');
					var buck = 'buck';
					if (room.shop[toId(item)].price > 1) buck = 'bucks';
					if (!room.shopBank) room.shopBank = room.founder;
					self.parse('/transferbucks '+room.shopBank+','+room.shop[toId(item)].price);
					fs.appendFile('logs/leagueshop_'+room.id+'.txt', '['+new Date().toJSON()+'] '+user.name+' has purchased a '+room.shop[toId(item)].price+' for '+room.shop[toId(item)].price+' '+buck+'.\n');
					room.add(user.name + ' has purchased a ' + room.shop[toId(item)].name + ' for ' + room.shop[toId(item)].price + ' ' + ((price === 1) ? " buck." : " bucks.") + '.');
				});
				break;
			case 'help':
				if (!this.canBroadcast()) return;
				this.sendReplyBox('The following is a list of league shop commands: <br />' +
					'/leagueshop view/list - Shows a complete list of shop items.`<br />' +
					'/leagueshop add [item name], [description], [price] - Adds an item to the shop.<br />' +
					'/leagueshop delete/remove [item name] - Removes an item from the shop.<br />' +
					'/leagueshop buy [item name] - Purchases an item from the shop.<br />' +
					'/leagueshop viewlog [number of lines OR word to search for] - Views the last 15 lines in the shop log.<br />' +
					'/leagueshop bank [username] - Sets the room bank to [username]. The room bank receives all funds from purchases in the shop.'
				);
				break;
			case 'setbank':
			case 'bank':
				if (user.userid !== room.founder && !user.can('seniorstaff')) return this.sendReply('/leagueshop - Access denied.');
				if (params.length < 1) return this.sendReply('Usage: /leagueshop bank [username]');
				var bank = params.shift();
				room.shopBank = toId(bank);
				room.chatRoomData.shopBank = room.shopBank;
				Rooms.global.writeChatRoomData();
				this.sendReply('The room bank is now set to '+room.shopBank);
				break;
			case 'log':
			case 'viewlog':
				if (!user.can('roommod', null, room)) return this.sendReply('/leagueshop - Access denied.');
				var target = params.shift();
				var lines = 0;
				if (!target.match('[^0-9]')) {
					lines = parseInt(target || 15, 10);
					if (lines > 100) lines = 100;
				}
				var filename = 'logs/leagueshop_'+room.id+'.txt';
				var command = 'tail -'+lines+' '+filename;
				var grepLimit = 100;
				if (!lines || lines < 0) { // searching for a word instead
					if (target.match(/^["'].+["']$/)) target = target.substring(1,target.length-1);
					command = "awk '{print NR,$0}' "+filename+" | sort -nr | cut -d' ' -f2- | grep -m"+grepLimit+" -i '"+target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]')+"'";
				}
 
				require('child_process').exec(command, function(error, stdout, stderr) {
					if (error && stderr) {
						user.popup('/leagueshop viewlog erred - the shop log does not support Windows');
						console.log('/leagueshop viewlog error: '+error);
						return false;
					}
					if (lines) {
						if (!stdout) {
							user.popup('The log is empty.');
						} else {
							user.popup('Displaying the last '+lines+' lines of shop purchases:\n\n'+stdout);
						}
					} else {
						if (!stdout) {
							user.popup('No purchases containing "'+target+'" were found.');
						} else {
							user.popup('Displaying the last '+grepLimit+' logged purchases containing "'+target+'":\n\n'+stdout);
						}
					}
				});
			break;
	 	}
	},

    shop: function(target, room, user) {
       if (!this.canBroadcast()) return;
       return this.sendReply('|raw|' + shopDisplay);
    },

    buy: function(target, room, user) {
        if (!target) return this.sendReply('/buy [command] - Buys an item from the shop.');
        var self = this;
        Economy.get(user.name).then(function(money) {
            var cost = findItem.call(self, target, money);
            if (!cost) return room.update();

            Economy.take(user.name, cost).then(function(total) {
                self.sendReply('You have bought ' + target + ' for ' + cost + 
                    Economy.currency(cost) + '. You now have ' + total + 
                    Economy.currency(total) + ' left.');
                room.addRaw(user.name + ' has bought <b>' + target + '</b> from the shop.');
                handleBoughtItem.call(self, target.toLowerCase(), user);
                room.update();
            });
        });
    },

    customsymbol: function(target, room, user) {
        if (!user.canCustomSymbol) return this.sendReply('You need to buy this item from the shop.');
        if (!target || target.length > 1) return this.sendReply('/customsymbol [symbol] - Get a custom symbol.');
        if (target.match(/[A-Za-z\d]+/g) || '?!+%@\u2605&~#'.indexOf(target) >= 0) return this.sendReply('Sorry, but you cannot change your symbol to this for safety/stability reasons.');
        user.customSymbol = target;
        user.updateIdentity();
        user.canCustomSymbol = false;
        user.hasCustomSymbol = true;
    },

    resetcustomsymbol: 'resetsymbol',
    resetsymbol: function(target, room, user) {
        if (!user.hasCustomSymbol) return this.sendReply('You don\'t have a custom symbol.');
        user.customSymbol = null;
        user.updateIdentity();
        user.hasCustomSymbol = false;
        this.sendReply('Your symbol has been reset.');
    },

    moneyladder: 'richestuser',
    richladder: 'richestuser',
    richestusers: 'richestuser',
    richestuser: function(target, room) {
        if (!this.canBroadcast()) return;
        var self = this;
        var display = '<center><u><b>Richest Users</b></u></center><br>\
                 <table border="1" cellspacing="0" cellpadding="5" width="100%">\
                   <tbody>\
                     <tr>\
                       <th>Rank</th>\
                       <th>Username</th>\
                       <th>Money</th>\
                   </tr>';
        User
            .find()
            .sort({money: -1})
            .limit(10)
            .exec(function(err, users) {
                if (err) return;
                users.forEach(function(user, index) {
                    display += '<tr>\
                                    <td>' + (index + 1) + '</td>\
                                    <td>' + user.name + '</td>\
                                    <td>' + user.money + '</td>\
                                </tr>';
                });
                display += '</tbody></table>';
                self.sendReply('|raw|' + display);
                room.update();
            });
    },

    resetbuck: 'resetmoney',
    resetbucks: 'resetmoney',
    resetmoney: function(target, room, user) {
        if (!user.can('resetmoney')) return this.sendReply('/resetmoney - Access denied.');
        var self = this;
        User.findOne({name: toId(target)}, function(err, user) {
            if (err) throw err;
            if (!user) {
                self.sendReply(target + ' already has 0 bucks.');
                return room.update();
            }
            user.money = 0;
            user.save(function(err) {
                if (err) throw err;
                self.sendReply(target + ' now has 0 bucks.');
                room.update();
            });
        });
    },

    registershop: function (target, room, user) {
    	if (!user.can('takemoney')) return this.sendReply('/registershop - Access Denied you silly goose!');
    	if (!target) return this.sendReply('Please specify a room you silly goose!');
    	if (!Rooms(toId(target))) return this.sendReply('That\'s not a real room you silly goose!');
    	targetRoom = target;
    	targetRoom.add('|raw|<div class="broadcast-green"><b>'+user.name+' has just purchased a league shop for this room.</b></div>');
	 				targetRoom.update();
	 				targetRoom.shop = new Object();
	 				targetRoom.shopList = new Array();
					targetRoom.chatRoomData.shop = targetRoom.shop;
					targetRoom.chatRoomData.shopList = targetRoom.shopList;
					Rooms.global.writeChatRoomData();
    },

    shopdeclare: function (target, room, user) {
        if (!user.canShopDeclare) return this.sendReply('You need to buy this item from the shop to use.');
        if (!target) return this.sendReply('/shopdeclare [message] - Send message to all rooms.');

        for (var id in Rooms.rooms) {
            if (id !== 'global') {
                Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b>' + target + '</b></div>');
            }
        }
        this.logModCommand(user.name + " globally declared " + target);
        user.canShopDeclare = false;
    },

    shoppm: function (target, room, user) {
        if (!user.canShopPM) return this.sendReply('You need to buy this item from the shop to use.');
        if (!target) return this.sendReply('/shoppm [message] - PM all users in the server.');
        if (target.indexOf('/html') >= 0) return this.sendReply('Cannot contain /html.');

        var pmName = '~Global PM from ' + user.name +' [Do not reply]';

        for (var name in Users.users) {
            var message = '|pm|' + pmName + '|' + Users.users[name].getIdentity() + '|' + target;
            Users.users[name].send(message);
        }
        user.canShopPM = false;
    }
};

/**
 * Displays the shop
 *
 * @param {Array} shop
 * @return {String} display
 */

function getShopDisplay(shop) {
    var display = '<table border="1" cellspacing="0" cellpadding="5" width="100%">\
                    <tbody>\
                        <tr>\
                            <th>Command</th>\
                            <th>Description</th>\
                            <th>Cost</th>\
                        </tr>';
    var start = 0;
    while (start < shop.length) {
        display += '<tr>\
                        <td><button name="send" value="/buy ' + shop[start][0] + '">' + shop[start][0] + '</button>' + '</td>\
                        <td>' + shop[start][1] + '</td>\
                        <td>' + shop[start][2] + '</td>\
                    </tr>';
        start++;
    }
    display += '</tbody></table><center>To buy an item from the shop, use /buy <em>command</em>.</center>';
    return display;
}

/**
 * Find the item in the shop.
 * 
 * @param {String} item
 * @param {Number} money
 * @return {Object}
 */

function findItem(item, money) {
    var len = shop.length;
    var price = 0;
    var amount = 0;
    while(len--) {
        if (item.toLowerCase() !== shop[len][0].toLowerCase()) continue;
        price = shop[len][2];
        if (price > money) {
            amount = price - money;
            this.sendReply('You don\'t have you enough money for this. You need ' + amount + Economy.currency(amount) + ' more to buy ' + item + '.');
            return false;
        }
        return price;
    }
    this.sendReply(item + ' not found in shop.');
}

/**
 * Handling the bought item from the shop.
 * 
 * @param {String} item
 * @param {Object} user
 */

function handleBoughtItem(item, user) {
    if (item === 'symbol') {
        user.canCustomSymbol = true;
        this.sendReply('You have purchased a custom symbol. You can use /customsymbol to get your custom symbol.');
        this.sendReply('You will have this until you log off for more than an hour.');
        this.sendReply('If you do not want your custom symbol anymore, you may use /resetsymbol to go back to your old symbol.'); 
   } else if (item === 'declare') {
        user.canShopDeclare = true;
        this.sendReply('You have purchased a declare. You can use /shopdeclare to declare your message.');
   } else if (item === 'pm') {
        user.canShopPM = true;
        this.sendReply('You have purchased a pm. You can use /shoppm to declare your message.');
   } else if (item === 'leagueshop')
   }else {
        var msg = user.name + ' has bought ' + item + '.';
        for (var i in Users.users) {
            if (Users.users[i].group === '~') {
                Users.users[i].send('|pm|~Shop Alert|' + Users.users[i].getIdentity() + '|' + msg);
            }
        } 
   }
}
