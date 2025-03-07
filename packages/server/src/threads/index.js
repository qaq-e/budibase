const workerFarm = require("worker-farm")
const env = require("../environment")

const ThreadType = {
  QUERY: "query",
  AUTOMATION: "automation",
}

function typeToFile(type) {
  let filename = null
  switch (type) {
    case ThreadType.QUERY:
      filename = "./query"
      break
    case ThreadType.AUTOMATION:
      filename = "./automation"
      break
    default:
      throw "Unknown thread type"
  }
  return require.resolve(filename)
}

class Thread {
  constructor(type, opts = { timeoutMs: null, count: 1 }) {
    this.type = type
    if (!env.isTest()) {
      const workerOpts = {
        autoStart: true,
        maxConcurrentWorkers: opts.count ? opts.count : 1,
      }
      if (opts.timeoutMs) {
        workerOpts.maxCallTime = opts.timeoutMs
      }
      this.workers = workerFarm(workerOpts, typeToFile(type))
    }
  }

  run(data) {
    return new Promise((resolve, reject) => {
      let fncToCall
      // if in test then don't use threading
      if (env.isTest()) {
        fncToCall = require(typeToFile(this.type))
      } else {
        fncToCall = this.workers
      }
      fncToCall(data, (err, response) => {
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    })
  }
}

module.exports.Thread = Thread
module.exports.ThreadType = ThreadType
