Features Implemented Till Now
Real-Time Location Sharing

Users can share their current GPS location in real-time on a Leaflet map.

The app continuously tracks and updates user location on the map.

Current user position is shown with a pulsing icon.

Group Tracking and Geofencing

Display other users’ locations within the same room/group.

Calculate and display the group center as the average of active users' locations.

Detect when users move outside a defined geofenced radius.

Show visual warnings and alerts if users are outside the geofence or far from the group.

Movement Trail Visualization

Trace recent movement paths of users with fading polylines.

User trails update dynamically and expire after a set duration.

Room-Based WebSocket Communication

Real-time communication of location updates and other events within rooms using socket.io.

Notify users on join/leave events.

Emit and listen for anomalies like SOS signals and location deviations.

SOS Alerts

Users can trigger SOS alerts.

SOS alerts generate chat messages, visual markers, and sound notifications.

SOS status reflected in UI with pulsating red icons.

Hazard Reporting

Users can mark hazards such as potholes and accidents.

Hazard reports include location, type, and reporting user.

Hazards appear on the map as yellow blinking warning icons.

Hazard markers persist for 5 minutes and update in real-time for all users.

Users receive toast notifications and chat updates about new hazards.

Chat Functionality

Real-time group chat integrated with the app.

Users can send and receive messages instantly.

Special messages (SOS, hazards) trigger alerts and sounds.

Routing and Directions

Calculate and display driving route between defined source and destination points.

Route shown as a blue polyline on the map.

Route updates dynamically on source/destination changes.

Battery Status Monitoring

Monitor battery level and charging status for users.

Display battery info in the user list with thresholds for low battery.

User Interface Features

Map auto-centers to user location with manual recenter button.

Side panel displays active users with statuses and battery info.

Toast notifications for important events.

Clickable markers with popups for user info and status.

Controls for toggling chat and user panels.

