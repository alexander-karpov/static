window.TextroomClient = class TextroomClient {
    constructor(HEAP32, SendMessage) {
        this.HEAP32 = HEAP32;
        this.SendMessage = SendMessage;
        this.receivedText = [];
        this.opponentUsername = undefined;

        this.textroom = new window.Textroom({
            onJoin: (user) => {
                this.OnOpponentJoined(user.username);
            },
            onLeave: (user) => {
                this.OnOpponentLeave(user.username);
            },
            onMessage: (text) => {
                this.receivedText.push(text);
            },
        });

        this.connectedThen = this.textroom.connect([
                'wss://yoide.su/janus-ws',
                'https://yoide.su/janus'
        ]);
    }

    Emit(eventName) {
        this.SendMessage('Textroom', 'RaiseEvent', eventName);
    }

    RoomsList() {
        return this.connectedThen.then(() => {
            return this.textroom.roomsList();
        }).then((rooms) => {
            const onePlayerRooms = rooms.filter((r) => r.num_participants === 1);
            const zeroPlayersRooms = rooms.filter((r) => r.num_participants === 0);
            const rooms_ = onePlayerRooms.length ? onePlayerRooms : zeroPlayersRooms;
        })
    }

    JoinRoom() {
        this.connectedThen.then(() => {
            return this.textroom.roomsList();
        }).then((rooms) => {
            const onePlayerRooms = rooms.filter((r) => r.num_participants === 1);
            const zeroPlayersRooms = rooms.filter((r) => r.num_participants === 0);
            const rooms_ = onePlayerRooms.length ? onePlayerRooms : zeroPlayersRooms;

            if (rooms_.length === 0) {
                throw new Error('No suitable rooms');
            }

            const randomRoom = rooms_[Math.floor(Math.random() * rooms_.length)];

            return this.textroom.join(randomRoom.room).then((participants) => {
                return {
                    room: randomRoom.room,
                    participants: participants,
                }
            });
        }).then(({ room, participants }) => {
            console.log(`I joined the room ${room}. Participants: ${participants.length}`);

            if (participants.length === 1) {
                this.opponentUsername = participants[0].username;
                this.Emit('Start B');
            }

            if (participants.length > 1) {
                console.log(`Too many opponents. Leave…`);
                this.textroom.leave().then(() => {
                    return this.JoinRoom();
                });
            }
        }).catch((error) => {
            setTimeout(() => this.JoinRoom(), 3000);

            console.error(error, 'Retry…');
        });
    };

    OnOpponentJoined(username) {
        console.log(`Opponent joined. ${username}`);

        if (this.opponentUsername) {
            console.log(`Unnecessary`);

            return;
        }

        this.opponentUsername = username;

        this.Emit('Start A');
    }

    OnOpponentLeave(username) {
        console.log(`Opponent left. ${username}`);

        if (this.opponentUsername === username) {
            console.log(`No opponents. Leave…`);

            this.opponentUsername = undefined;
            this.Emit('Opponent Leave');

            this.textroom.leave().then(() => {
                return this.JoinRoom();
            });
        }
    }

    Send(offset, size) {
        const view = new Int32Array(this.HEAP32.buffer, offset, size);

        this.textroom.message(view.toString());
    }

    /**
     * @returns Количество сообщений до считывания
     */
    Receive(offset, size) {
        const countBeforeRead = this.receivedText.length;

        if (countBeforeRead) {
            const view = new Int32Array(this.HEAP32.buffer, offset, size);
            view.set(this.receivedText[0].split(','));

            this.receivedText.shift();
        }

        return countBeforeRead;
    }
};
