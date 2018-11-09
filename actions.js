const ghReservedNames = require("github-reserved-names")

const util = require("./util")

const actions = {}

// Globally applicable actions
// ===========================

// URL Manipulation/querying
// -------------------------
actions.vimEditURL = () => Front
  .showEditor(window.location.href, (data) => {
    window.location.href = data
  }, "url")

actions.getURLPath = ({ count = 0, domain = false } = {}) => {
  let path = window.location.pathname.slice(1)
  if (count) {
    path = path.split("/").slice(0, count).join("/")
  }
  if (domain) {
    path = `${window.location.hostname}/${path}`
  }
  return path
}

actions.copyURLPath = ({ count, domain } = {}) =>
  () => Clipboard.write(actions.getURLPath({ count, domain }))

// Whois/DNS lookup
// ----------------
const domainDossierUrl = "http://centralops.net/co/DomainDossier.aspx"

actions.showWhois = ({ hostname = window.location.hostname } = {}) =>
  () => tabOpenLink(`${domainDossierUrl}?dom_whois=true&addr=${hostname}`)

actions.showDns = ({ hostname = window.location.hostname, verbose = false } = {}) =>
  () => {
    if (verbose) {
      tabOpenLink(`${domainDossierUrl}?dom_whois=true&dom_dns=true&traceroute=true&net_whois=true&svc_scan=true&addr=${hostname}`)
    } else {
      tabOpenLink(`${domainDossierUrl}?dom_dns=true&addr=${hostname}`)
    }
  }

// Surfingkeys-specific actions
// ----------------------------
actions.createHint = (selector, action = Hints.dispatchMouseClick) =>
  () => Hints.create(selector, action)

actions.open = ({ newTab = false, prop = "href" } = {}) => a => window.open(a[prop], newTab ? "_BLANK" : undefined)

actions.editSettings = () => tabOpenLink("/pages/options.html")

actions.togglePdfViewer = () =>
  chrome.storage.local.get("noPdfViewer", (resp) => {
    if (!resp.noPdfViewer) {
      chrome.storage.local.set({ noPdfViewer: 1 }, () => {
        Front.showBanner("PDF viewer disabled.")
      })
    } else {
      chrome.storage.local.remove("noPdfViewer", () => {
        Front.showBanner("PDF viewer enabled.")
      })
    }
  })

// Site-specific actions
// =====================

// FakeSpot
// --------
actions.fakeSpot = (url = window.location.href) => tabOpenLink(`http://fakespot.com/analyze?url=${url}`)

// Godoc
// -----
actions.viewGodoc = () =>
  tabOpenLink(`https://godoc.org/${actions.getURLPath({ count: 2, domain: true })}`)

// GitHub
// ------
actions.gh = {}
actions.gh.star = ({ toggle = false } = {}) => () => {
  const repo = window.location.pathname.slice(1).split("/").slice(0, 2).join("/")
  const container = document.querySelector("div.starring-container")
  const status = container.classList.contains("on")

  let star = "★"
  let statusMsg = "starred"
  let verb = "is"

  if ((status && toggle) || (!status && !toggle)) {
    statusMsg = `un${statusMsg}`
    star = "☆"
  }

  if (toggle) {
    verb = "has been"
    if (status) {
      container.querySelector(".starred>button").click()
    } else {
      container.querySelector(".unstarred>button").click()
    }
  }

  Front.showBanner(`${star} Repository ${repo} ${verb} ${statusMsg}!`)
}

actions.gh.openRepo = () => {
  const elements = [...document.querySelectorAll("a[href]")]
    .filter(a => {
      const u = new URL(a.href)
      const [user, repo, ...rest] = u.pathname.split("/").filter(s => s !== "")
      return (
        u.origin === window.location.origin &&
        u.hash === "" &&
        u.search === "" &&
        typeof user === "string" &&
        typeof repo === "string" &&
        rest.length === 0 &&
        repo.length >= 1 &&
        /^([a-zA-Z0-9]+-?)+$/.test(user) &&
        !ghReservedNames.check(user)
      )
    })
  Hints.create(elements, Hints.dispatchMouseClick)
}

actions.gh.openUser = () => {
  const elements = [...document.querySelectorAll("a[href]")]
    .filter(a => {
      const u = new URL(a.href)
      const [user, ...rest] = u.pathname.split("/").filter(s => s !== "")
      return (
        u.origin === window.location.origin &&
        u.hash === "" &&
        u.search === "" &&
        typeof user === "string" &&
        rest.length === 0 &&
        /^([a-zA-Z0-9]+-?)+$/.test(user) &&
        !ghReservedNames.check(user)
      )
    })
  Hints.create(elements, Hints.dispatchMouseClick)
}

actions.gh.openFile = () => {
  const elements = [...document.querySelectorAll("a[href]")]
    .filter(a => {
      const u = new URL(a.href)
      const [user, repo, maybeBlob, ...rest] = u.pathname.split("/").filter(s => s !== "")
      return (
        u.origin === window.location.origin &&
        u.hash === "" &&
        u.search === "" &&
        typeof user === "string" &&
        typeof maybeBlob === "string" &&
        ( maybeBlob === "blob" || maybeBlob === "tree" ) &&
        rest.length !== 0 &&
        /^([a-zA-Z0-9]+-?)+$/.test(user) &&
        !ghReservedNames.check(user)
      )
    })
  Hints.create(elements, Hints.dispatchMouseClick)
}

actions.gh.goParent = () => {
  const segments = window.location.pathname
    .split("/").filter(s => s !== "")
  const newPath = (() => {
    const [user, repo, maybeBlob] = segments
    switch(segments.length) {
      case 0:
        return false
      case 4:
        switch(maybeBlob) {
          case "blob":
          case "tree":
            return [user, repo]
          case "pull":
            return [user, repo, "pulls"]
        }
      case 5:
        if (maybeBlob === "blob") {
          return [user, repo]
        }
    }
    return segments.slice(0, segments.length - 1)
  })()
  if(newPath !== false) {
    window.location.assign(`${window.location.origin}/${newPath.join("/")}`)
  }
}

// GitLab
// ------
actions.gl = {}
actions.gl.star = () => {
  const repo = window.location.pathname.slice(1).split("/").slice(0, 2).join("/")
  const btn = document.querySelector(".btn.star-btn > span")
  btn.click()
  const action = `${btn.textContent.toLowerCase()}red`
  let star = "☆"
  if (action === "starred") {
    star = "★"
  }
  Front.showBanner(`${star} Repository ${repo} ${action}`)
}

// Reddit
// ------
actions.re = {}
actions.re.collapseNextComment = () => {
  const vis = Array.from(document.querySelectorAll(".noncollapsed.comment"))
    .filter(e => util.isElementInViewport(e))
  if (vis.length > 0) {
    vis[0].querySelector(".expand").click()
  }
}

// Unfortunately, this does not work - Reddit will only load the first
// Expando
actions.re.toggleVisibleExpandos = (dir = 0) => () => {
  let sel = ".expando-button"
  if (dir === -1) {
    sel += ".expanded"
  } else if (dir === 1) {
    sel += ".collapsed"
  }
  console.log(sel)
  Array.from(document.querySelectorAll(sel))
    .filter(e => util.isElementInViewport(e))
    .forEach(e => e.click())
}

// HackerNews
// ----------
actions.hn = {}
actions.hn.goParent = () => {
  const par = document.querySelector(".par>a")
  if (!par) {
    return
  }
  window.location.assign(par.href)
}

actions.hn.collapseNextComment = () => {
  const vis = Array.from(document.querySelectorAll("a.togg"))
    .filter(e => e.innerText === "[-]" && util.isElementInViewport(e))
  if (vis.length > 0) {
    vis[0].click()
  }
}

// ProductHunt
// -----------
actions.ph = {}
actions.ph.openExternal = () => {
  Hints.create("ul[class^='postsList_'] > li > div[class^='item_']", p =>
    tabOpenLink(p.querySelector("div[class^='meta_'] > div[class^='actions_'] > div[class^='minorActions_'] > a:nth-child(1)").href))
}

// Dribbble
// --------
actions.dr = {}
actions.dr.attachment = (cb = a => tabOpenLink(a)) =>
  actions.createHint(".attachments .thumb", a => cb(a.src.replace("/thumbnail/", "/")))

// Wikipedia
// ---------
actions.wp = {}
actions.wp.toggleSimple = () => {
  window.location.hostname = window.location.hostname.split(".")
    .map((s, i) => {
      if (i === 0) {
        return s === "simple" ? "" : "simple"
      }
      return s
    }).filter(s => s !== "").join(".")
}

module.exports = actions
