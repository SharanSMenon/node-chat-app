const path = require('path');
const http = require('http');
const {
    ObjectID
} = require('mongodb')
const moment = require('moment')
const express = require('express')
const socketIO = require('socket.io');
const mongoose = require('./mongoose');
const _ = require('lodash')
const {
    User
} = require('./models/user')
const {
    generateMessage,
    generateLocationMessage
} = require('./utils/message');
const {
    isRealString
} = require('./utils/validation')
const {
    Users
} = require('./utils/users')
const publicPath = path.join(__dirname, '../public')
const port = process.env.PORT || 5000;
var app = express();
var server = http.createServer(app)
var io = socketIO(server);
var users = new Users();
app.use(express.static(publicPath));

io.on('connection', (socket) => {
    console.log('New user connected')
    socket.on('join', (params, callback) => {
        if (!isRealString(params['display']) || !isRealString(params['room'])) {
            return callback('Name and room name are required')
        }
        var userList = users.getUserList(params.room);
        var match = userList.find(user => user === params['display'])
        // console.log(match
        if (match || params['display'] == 'Admin') {
            return callback('Name is already taken in room')
        }
        socket.join(params['room']);
        users.removeUser(socket.id);
        users.addUser(socket.id, params['display'], params['room'])
        io.to(params['room']).emit('updateUserList', users.getUserList(params['room']));
        // socket.leave(params['room'])
        socket.broadcast.to(params['room']).emit('newMessage', generateMessage('Admin', `${params['display']} has joined the room`))
        const time = moment(new Date().getTime()).toString();
        User.findOneAndUpdate({
            name: 'Admin',
            room: params['room']
        }, {
            $push: {
                message: `${params['display']} has joined the room`,
                createdAt: time
            }
        }, (error, foundUser) => {
            if (!foundUser) {
                new User({
                    _id: ObjectID(),
                    name: 'Admin',
                    room: params['room'],
                    message: `${params['display']} has joined the room`,
                    createdAt: time
                }).save()
            }
        })
        User.find({
                room: params['room']
            })
            .select('-_id -room -__v')
            .exec((err, users) => {
                let result = _.flatten(users.map(user => _.zipWith(_.fill(Array(user.createdAt.length), user.name), user.createdAt, user.message, (name, time, message) => {
                    return _.defaults({
                        name,
                        time,
                        message
                    });
                })));
                result.forEach(item => {
                    console.log(item)
                    socket.emit('newMessage', {
                        from: item.name,
                        text: item.message,
                        createdAt: item.time
                    })
                });
            })
        socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'))
        callback()
    })
    socket.on('createMessage', (message, callback) => {
        var user = users.getUser(socket.id)
        if (user && isRealString(message.text)) {
            const time = moment(new Date().getTime()).toString();
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text))
            User.findOneAndUpdate({
                name: user.name,
                room: user.room
            }, {
                $push: {
                    message:message.text,
                    createdAt:time
                }
            }, (error, foundUser) => {
                if (!foundUser) {
                    new User({
                        _id:user.id,
                        name:user.name,
                        room:user.room,
                        message: message.text,
                        createdAt: time
                    }).save()
                }
            })
        }
        callback()
    })
    socket.on('createLocationMessage', (coords) => {
        var user = users.getUser(socket.id)
        if (user) {
            const time = moment(new Date().getTime()).toString();
            var msg = generateLocationMessage(user.name, coords.latitude, coords.longitude)
            io.to(user.room).emit('newLocationMessage', msg)
            User.findOneAndUpdate({
                name: user.name,
                room: user.room
            }, {
                $push: {
                    message:msg.url,
                    createdAt:time
                }
            }, (error, foundUser) => {
                if (!foundUser) {
                    new User({
                        _id:user.id,
                        name:user.name,
                        room:user.room,
                        message: `<a href=${msg.url}><a>`,
                        createdAt: time
                    }).save()
                }
            })
        }
    })
    socket.on('disconnect', () => {
        var user = users.removeUser(socket.id);
        if (user) {
            const time = moment(new Date().getTime()).toString();
            io.to(user.room).emit('updateUserList', users.getUserList(user.room))
            io.to(user.room).emit('newMessage', generateMessage(
                'Admin',
                `${user.name} has left the room`
            ))
            User.findOneAndUpdate({
                name:'Admin',
                room:user.room
            }, (error, user) => {
                if (!user){
                    new User({
                        _id: ObjectID(),
                        name:'Admin',
                        room:user.room,
                        message:`${user.name} has left`,
                        createdAt: time
                    })
                }
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on ${port}`);
})