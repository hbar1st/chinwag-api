
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
- [x] GET /user [list the username/email/nickname/profile/avatar_id image of a user - will display only if authenticated user is querying]
- [x] GET /user/:id [list the id, nickname and avatar_id of the user - does not need to be the same user who is querying for it]
- [] GET /user?username={}  [list by username - will return an id, nickname and profile image only if the auth user is not this same user]
- [] GET /user?email={} [list by email - will return an id, nickname and a profile image only if the auth user is not this same user]
- [x] PUT /user  [change the username/email/nickname/password of a user]
- [x] GET /user/image 
- [x] PUT /user/image [ change the authenticated user's profile image - uploads to Cloudinary]
- [x] DELETE /user/image [delete the authenticated user's profile image - deletes from Cloudinary]
- [x] DELETE /user [delete the user account]

- [x] POST /chat [creates a new chat with a person - in the form: the recipient's id. Messages come later. Only runs if we don't have an ongoing chat already]
- [x] GET /chat/:id [returns top level data like desc - not messages. Use GET /chat/:id/message to get the messages. Returns 204 if user is no longer in the chat]
- [x] POST /chat/:id/message [adds more messages to the same chat]
- [x] GET /chat/:id/message [gets all the messages in a chat]
- [x] PUT /message/:id [to edit an existing message. Can change the message. TODO: Can also be used to set the time the user read the message.]
- [x] DELETE /message/:id [can delete one's own message. if a message is deleted which was replied to, the replied_to field will point at nothing valid so will show 'deleted' in the client? ]
- [x] GET /chat [gets all chat for the current user including unread message counts]
- [x] DELETE /chat/:id  [deletes a specific chat but only if this is the last member in the chat to leave. Otherwise, just marks the auth user as having left the chat.]
- [] GET /chat/:id/message/unread_count [is a count of every single message this user got sent filtered to the ones that are unread in the specified chat]


## Bonus Functionality

- [ ] Allow adding images in chat
- [ ] Create a friends list that shows online or offline status
GET /user/:id/friend [lists all the friends and their last active timestamps so the client can decide how to display online/offline status themselves]
- [ ] Allow group chats between friends

## Beyond the Bonus Functionality
- [] allow adding / removing reactions
- [] allow listing reactions
- [] Archive chats
- [] Block users