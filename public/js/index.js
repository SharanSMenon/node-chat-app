var socket = io();

socket.on('connect', function () {
    console.log('Connected to server')
})

socket.on('disconnect', function () {
    console.log('Disconnected from server');
})

socket.on('newMessage', function (message) {
    console.log('newMessage', message)
    var li = jQuery('<li></li>');
    li.text(`${message.from}: ${message.text}`)
    jQuery("#messages").append(li);
})
socket.on('newLocationMessage', function(message){ 
    var li = jQuery("<li></li>")
    var a = jQuery('<a target="_blank">My Current Location</a>')
    li.text(`${message.from}: `)
    a.attr('href', message.url)
    li.append(a);
    jQuery("#messages").append(li);
})
jQuery("#message-form").on('submit', function(e){
    e.preventDefault();
    var messageTextBox = jQuery('[name=message]')
    socket.emit('createMessage', {
        from:'User',
        text: messageTextBox.val()
    }, function (){
        messageTextBox.val('')
    })
})
var locationButton = jQuery('#send-location');
locationButton.on('click', function(){
    if (!navigator.geolocation) {
        return alert('Geolocation not supported by your browser.')
    }
    locationButton.attr('disabled','disabled');
    locationButton.text('Sending location...')
    navigator.geolocation.getCurrentPosition(function(position){
        console.log(position)
        locationButton.removeAttr('disabled')
        locationButton.text('Send location')
        socket.emit('createLocationMessage', {
            latitude:position.coords.latitude,
            longitude:position.coords.longitude
        })
    }, function() {
        locationButton.removeAttr('disabled')
        locationButton.text('Send location')
        alert("Unable to fetch location")
    })
})