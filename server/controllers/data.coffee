git = require 'git-rev'

db = require('../helpers/db_connect_helper').db_connect()
feed = require '../lib/feed'
dbHelper = require '../lib/db_remove_helper'
encryption = require '../lib/encryption'
account = require './accounts'

## Before and after methods

## Encrypt data in field password
module.exports.encryptPassword = (req, res, next) ->
    try
        password = encryption.encrypt req.body.password
    catch error
        return next error

    req.body.password = password if password?
    next()

# Decrypt data in field password
module.exports.decryptPassword = (req, res, next) ->
    try
        password = encryption.decrypt req.doc.password
    catch error
        req.doc._passwordStillEncrypted = true if req.doc.password?
        account.addApp req.appName

    req.doc.password = password if password?
    next()


## Actions

# Welcome page
module.exports.index = (req, res) ->

    git.long (commit) ->
        git.branch (branch) ->
            git.tag (tag) ->
                res.send 200, """
                <strong>Cozy Data System</strong><br />
                revision: #{commit}  <br />
                tag: #{tag} <br />
                branch: #{branch} <br />
                """

# GET /data/exist/:id/
module.exports.exist = (req, res, next) ->
    db.head req.params.id, (err, response, status) ->
        if status is 200
            res.send 200, exist: true
        else if status is 404
            res.send 200, exist: false
        else
            next err

# GET /data/:id/
module.exports.find = (req, res) ->
    delete req.doc._rev # CouchDB specific, user don't need it
    res.send 200, req.doc

# POST /data/:id/
# POST /data/
module.exports.create = (req, res, next) ->

    delete req.body._attachments # attachments management has a dedicated API
    if req.params.id?
        db.get req.params.id, (err, doc) -> # this GET needed because of cache
            if doc?
                err = new Error "The document already exists."
                err.status = 409
                next err
            else
                db.save req.params.id, req.body, (err, doc) ->
                    if err
                        err = new Error "The document already exists."
                        err.status = 409
                        next err
                    else
                        res.send 201, _id: doc.id
    else
        db.save req.body, (err, doc) ->
            if err
                next err
            else
                res.send 201, _id: doc.id

# PUT /data/:id/
# this doesn't take care of conflict (erase DB with the sent value)
module.exports.update = (req, res, next) ->
    delete req.body._attachments # attachments management has a dedicated API

    db.save req.params.id, req.body, (err, response) ->
        if err then next err
        else
            res.send 200, success: true
            next()

# PUT /data/upsert/:id/
# this doesn't take care of conflict (erase DB with the sent value)
module.exports.upsert = (req, res, next) ->
    delete req.body._attachments # attachments management has a dedicated API

    db.get req.params.id, (err, doc) ->
        db.save req.params.id, req.body, (err, savedDoc) ->
            if err
                next err
            else if doc?
                res.send 200, success: true
                next()
            else
                res.send 201, _id: savedDoc.id
                next()

# DELETE /data/:id/
# this doesn't take care of conflict (erase DB with the sent value)
module.exports.delete = (req, res, next) ->
    dbHelper.remove req.doc, (err) ->
        if err
            next err
        else
            res.send 204, success: true
            next()

# PUT /data/merge/:id/
# this doesn't take care of conflict (erase DB with the sent value)
module.exports.merge = (req, res, next) ->
    delete req.body._attachments # attachments management has a dedicated API
    db.merge req.params.id, req.body, (err, doc) ->
        if err
            next err
        else
            res.send 200, success: true
            next()
