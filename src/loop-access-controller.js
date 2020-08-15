'use strict'
const { io } = require('./utils')
const AccessController = require('./access-controller-interface')
const type = 'loop'

class LoopAccessController extends AccessController {
  constructor (ipfs, options) {
    super()
    this._ipfs = ipfs
    this._write = Array.from(options.write || [])
  }

  // Returns the type of the access controller
  static get type () { return type }

  // Return a Set of keys that have `access` capability
  get write () {
    return this._write
  }

  async canAppend (entry, identityProvider) {
    try {
      // Allow if access list contain the writer's publicKey or is '*'
      const { id, publicKey: key } = entry.identity
      const write = this.write
      if (write.includes(id) || write.includes(key) || write.includes('*')) {
        // check identity is valid
        return identityProvider.verifyIdentity(entry.identity)
      } else if (this._loop) {
        const admins = this._loop.get('admin')
        if (admins.has(id) || admins.has(key)) {
          // check identity is valid
          return identityProvider.verifyIdentity(entry.identity)
        }
      }
      return false
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async load (address) {
    // Transform '/ipfs/QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    // to 'QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    if (address.indexOf('/ipfs') === 0) { address = address.split('/')[2] }

    try {
      this._write = await io.read(this._ipfs, address)
    } catch (e) {
      console.log('LoopAccessController.load ERROR:', e)
    }
  }

  async save () {
    let cid
    try {
      cid = await io.write(this._ipfs, 'dag-cbor', { write: JSON.stringify(this.write, null, 2) })
    } catch (e) {
      console.log('LoopAccessController.save ERROR:', e)
    }
    // return the manifest data
    return { address: cid }
  }

  connectLoop (accessController) {
    this._loop = accessController
  }

  static async create (orbitdb, options = {}) {
    options = { ...options, ...{ write: options.write || [orbitdb.identity.id] } }
    return new LoopAccessController(orbitdb._ipfs, options)
  }
}

module.exports = LoopAccessController
