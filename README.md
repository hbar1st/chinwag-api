
# chinwag-api [phase 1]

TOP's messaging project api. 

## Core Functionality:

- [ ] Authorization 
- [ ] Sending messages to another user 
- [ ] Customizing a user profile 

### Use TDD as much as possible during development

(see bonus functionality at the bottom of this file)

# Setup Requirements

- must install docker
- must be running on linux

# Initial Setup Instructions

- run `npm install` in the root path
- run `npm run db:start' and confirm the output shows a docker network and volume were created (chinwag_net & chinwag-api-pgdata). Container will be started
- 

# Contribution Guidelines

- contributions will not be accepted while this project is in phase 1. This is a student project and must be completed by hbar1st only.
Once phase 1 is done, contributions may be accepted if an issue is opened and triaged appropriately first by hbar1st.


# MVP

## User Stories

### Non-registered ChinWag User:

- As a user, I want to register so that I can use the app's features. /v1/user/signup

### Registered ChinWag User:

- As a registered user, I want to be able to login so that I view and use the app's features (messages/profile)
- As a registered user, I want to be able to request that my account be deleted.

### Authenticated (logged in) User:

- As a logged in user, I want to see all my message notifications so that I can read them.
- As a auth user, I want to be able to see my profile so I can edit it.

## API Routes

- [x] POST /user/login 
- [x] POST /user/signup
- [x] GET /user/:id [list the username/email/nickname/profile/avatar_url image of a user - will display only if authenticated user is querying]
- GET /user?username={}  [list by username - will display a username and profile image only if the auth user is not this same user]
- GET /user?email={} [list by email - will display an email and a profile image only if the auth user is not this same user]
- [ ] PUT /user/:id  [change the username/email/nickname/avatar_url of a user]
- POST /user/:id/image  [ add a profile image]
- GET /user/:id/image 
- PUT /user/:id/image [ change the profile image]
- DELETE /user/:id/image [delete the profile image]
- DELETE /user/:id [delete the user account]

- POST /message [in the form: the recipient id, the message, any images]
- PUT /message/:id [to edit an existing message. Can change the message or the image(s)]
- DELETE /message/:id [can delete one's own message. IF it is a REPLY, then the form will include a reply field with replied to message's id]
- GET /chat [gets all chat for the current user]
- DELETE /chat/:id  [deletes a specific chat]
- GET /chat/:id/message/ [gets all the messages for this user in a certain chat]
- GET /chat/:id/message/unread_count [is a count of every single message this user got sent filtered to the ones that are unread in the chat]
- GET /message/unread_count [gets a count of every single new message this user received]


## Bonus Functionality

- [ ] Allow adding images in chat
- [ ] Create a friends list that shows online or offline status
GET /user/:id/friend [lists all the friends and their last active timestamps so the client can decide how to display online/offline status themselves]
- [ ] Allow group chats between friends