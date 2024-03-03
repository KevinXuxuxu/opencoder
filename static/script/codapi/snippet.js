function codapi_main() {
    var R = /^([^:]+):(@?\S+)$/,
        h = class n {
            constructor(t, e, s) {
                (this.title = t), (this.type = e), (this.value = s);
            }
            static parse(t) {
                let e = R.exec(t);
                if (!e) return null;
                let s = e[1].replaceAll("_", " "),
                    i = e[2][0] == "@" ? "event" : "command",
                    o = e[2][0] == "@" ? e[2].slice(1) : e[2];
                return new n(s, i, o);
            }
        };
    var T = document.createElement("template");
    T.innerHTML = `
<span class="label label-rounded label-secondary c-hand">Run</span>
<a href="#edit" hidden>Edit</a>
<codapi-status></codapi-status>
`;
    var f = class extends HTMLElement {
        constructor() {
            super();
        }
        connectedCallback() {
            this.ready || (this.render(), this.listen(), (this.ready = !0));
        }
        render() {
            this.appendChild(T.content.cloneNode(!0)), (this.run = this.querySelector("span")), (this.edit = this.querySelector("a")), (this.status = this.querySelector("codapi-status"));
            let t = this.getAttribute("actions");
            this.addActions(t ? t.split(" ") : null);
        }
        listen() {
            this.run.addEventListener("click", (t) => {
                this.dispatchEvent(new Event("run"));
            }),
                this.edit.addEventListener("click", (t) => {
                    t.preventDefault(), this.dispatchEvent(new Event("edit"));
                });
        }
        addActions(t) {
            if (t)
                for (let e of t) {
                    let s = h.parse(e);
                    if (!s) continue;
                    let i = this.createButton(s);
                    this.insertBefore(i, this.status);
                }
        }
        createButton(t) {
            let e = document.createElement("a");
            return (
                e.addEventListener("click", (s) => {
                    s.preventDefault();
                    let i = new CustomEvent(t.type, { detail: t.value });
                    this.dispatchEvent(i);
                }),
                (e.innerText = t.title),
                (e.href = "#" + t.value),
                e
            );
        }
        showRunning() {
            this.run.setAttribute("disabled", ""), this.status.showRunning();
        }
        showFinished(t) {
            this.run.removeAttribute("disabled"), this.status.showFinished(t);
        }
        showStatus(t) {
            this.run.removeAttribute("disabled"), this.status.showMessage(t);
        }
        get editable() {
            return !this.edit.hasAttribute("hidden");
        }
        set editable(t) {
            t ? this.edit.removeAttribute("hidden") : this.edit.setAttribute("hidden", "");
        }
    };
    var y = { running: "Running...", failed: "\u2718 Failed", done: "\u2713 Done" },
        p = class extends HTMLElement {
            showRunning() {
                let t = this.getAttribute("running") || y.running;
                this.innerHTML = `
            <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg>
            ${t}
        `;
            }
            showFinished(t) {
                if (!t.ok) {
                    this.innerText = this.getAttribute("failed") || y.failed;
                    return;
                }
                let e = this.getAttribute("done") || y.done;
                (e = e.replace("$DURATION", t.duration)),
                    (this.innerHTML = `
            ${e}
            <span data-ref>\u2022 <a href="https://codapi.org/">codapi</a></span>`);
            }
            showMessage(t) {
                this.innerText = t;
            }
        };
    function O(n, t) {
        let e = n.indexOf(t);
        return e >= 0 ? [n.slice(0, e), n.slice(e + t.length)] : [n, ""];
    }
    function q(n) {
        let t = document.createElement("div");
        return (t.innerText = n), t.innerHTML;
    }
    var r = { cut: O, sanitize: q };
    var A = document.createElement("template");
    A.innerHTML = `
<a href="#close">\u2715</a>
<pre class="code"><code></code></pre>
`;
    var m = class extends HTMLElement {
        constructor() {
            super();
        }
        connectedCallback() {
            this.ready ||
                (this.appendChild(A.content.cloneNode(!0)),
                (this.close = this.querySelector("a")),
                (this.output = this.querySelector("pre > code")),
                this.close.addEventListener("click", (t) => {
                    t.preventDefault(), this.hide();
                }),
                (this.ready = !0));
        }
        fadeOut() {
            this.style.opacity = 0.4;
        }
        fadeIn() {
            setTimeout(() => {
                this.style.opacity = "";
            }, 100);
        }
        showResult(t) {
            let e = [];
            t.stdout && e.push(r.sanitize(t.stdout)),
                t.stderr && e.push(r.sanitize(t.stderr)),
                (this.output.innerHTML = e.join(`
`)),
                this.show();
        }
        showMessage(t) {
            (this.output.innerText = t), t ? this.show() : this.hide();
        }
        showError(t) {
            let e =
                t.message +
                (t.stack
                    ? `
${t.stack}`
                    : "");
            this.showMessage(e);
        }
        show() {
            this.removeAttribute("hidden");
        }
        hide() {
            this.setAttribute("hidden", "");
        }
    };
    async function w(n, t = {}) {
        let { timeout: e = 1e4 } = t,
            s = new AbortController(),
            i = setTimeout(() => s.abort(), e),
            o = await fetch(n, { ...t, signal: s.signal });
        return clearTimeout(i), o;
    }
    var N = "https://api.codapi.org/v1",
        j = "Something is wrong with Codapi.",
        I = {
            400: "Bad request. Something is wrong with the request, not sure what.",
            404: "Unknown sandbox or command.",
            403: "Forbidden. Your domain is probably not allowed on Codapi.",
            413: "Request is too large. Try submitting less code.",
            429: "Too many requests. Try again in a few seconds.",
        };
    async function B(n, t) {
        try {
            let e = `${n || N}/exec`,
                s = await w(e, { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(t) });
            if (!s.ok) {
                let i = I[s.status] || j;
                return { ok: !1, duration: 0, stdout: "", stderr: `${s.status} - ${i}` };
            }
            return await s.json();
        } catch (e) {
            throw new Error(`request to ${n} failed`, { cause: e });
        }
    }
    var k = { init: () => {}, exec: B };
    async function P(n, t) {
        try {
            let e = U(t.files[""]);
            e.url = _(e.url, n);
            let [s, i] = await W(e);
            return { ok: !0, duration: i, stdout: s, stderr: "" };
        } catch (e) {
            return { ok: !1, duration: 0, stdout: "", stderr: e.toString() };
        }
    }
    function U(n) {
        let t = n.split(`
`),
            e = 0,
            s = t[0].split(" ").filter((c) => c),
            [i, o] = s.length >= 2 ? s : ["GET", s[0]];
        e += 1;
        let a = [];
        for (let c = e; c < t.length; c++) {
            let u = t[c].trim();
            if (u.startsWith("?") || u.startsWith("&")) a.push(u), (e += 1);
            else break;
        }
        let l = {};
        for (let c = e; c < t.length; c++) {
            let u = t[c].trim();
            if (u === "") break;
            let [H, D] = r.cut(u, ":");
            (l[H.trim()] = D.trim()), (e += 1);
        }
        let E = t.slice(e + 1).join(`
`);
        return { method: i, url: o + a.join(""), headers: l, body: E };
    }
    function _(n, t) {
        if (!t) return n;
        let e = new URL(n),
            s = new URL(t);
        return (e.protocol = s.protocol), (e.username = s.username), (e.password = s.password), (e.host = s.host), (e.pathname = s.pathname), e.href;
    }
    async function W(n) {
        let t = new Date(),
            e = await z(n),
            s = await J(e),
            i = new Date() - t;
        return [s, i];
    }
    async function z(n) {
        let t = { method: n.method, headers: n.headers, body: n.body || void 0 };
        return await w(n.url, t);
    }
    async function J(n) {
        let t = "HTTP/1.1",
            e = await n.text(),
            s = [`${t} ${n.status} ${n.statusText}`];
        for (let i of n.headers.entries()) s.push(`${i[0]}: ${i[1]}`);
        return (
            e && s.push("", e),
            s.join(`
`)
        );
    }
    var L = { exec: P };
    var K = async function () {}.constructor;
    async function G(n, t) {
        try {
            let e = [];
            return (
                Y(e),
                {
                    ok: !0,
                    duration: await V(t.files[""]),
                    stdout: e.join(`
`),
                    stderr: "",
                }
            );
        } catch (e) {
            return { ok: !1, duration: 0, stdout: "", stderr: e.toString() };
        } finally {
            Z();
        }
    }
    async function V(n) {
        let t = new K(n),
            e = new Date();
        return await t(), new Date() - e;
    }
    function Y(n) {
        let t = new Proxy(console, {
            get(e, s) {
                return s === "log" || s === "error" || s === "warn"
                    ? (...i) => {
                          let o = i.map((a) => Q(a)).join(" ");
                          n.push(o), e[s](...i);
                      }
                    : e[s];
            },
        });
        (window._console = window.console), (window.console = t), window.addEventListener("error", (e) => console.log(e.error));
    }
    function Z() {
        (window.console = window._console), delete window._console;
    }
    function Q(n) {
        switch (typeof n) {
            case "undefined":
                return "undefined";
            case "object":
                return JSON.stringify(n);
            default:
                return n.toString();
        }
    }
    var C = { exec: G };
    var S = { javascript: C.exec, fetch: L.exec };
    async function X(n, t) {
        try {
            return tt(t)(n, t);
        } catch (e) {
            return { ok: !1, duration: 0, stdout: "", stderr: e.toString() };
        }
    }
    function tt(n) {
        if (!(n.sandbox in S)) throw Error(`unknown sandbox: ${n.sandbox}`);
        if (n.command != "run") throw Error(`unknown command: ${n.sandbox}.${n.command}`);
        return S[n.sandbox];
    }
    var M = { init: () => {}, exec: X };
    var et = "codapi",
        nt = "run",
        b = class {
            constructor({ engine: t, sandbox: e, command: s, url: i, template: o, files: a }) {
                let [l, E] = r.cut(e, ":");
                (this.engineName = t || et), (this.sandbox = l), (this.version = E), (this.command = s || nt), (this.url = i), (this.template = o), (this.files = a);
            }
            get engine() {
                let t = window.Codapi.engines[this.engineName];
                if (!t) throw new Error(`unknown engine: ${this.engineName}`);
                return t;
            }
            async execute(t, e) {
                e = await this.prepare(e);
                let s = await this.loadFiles();
                return await this.engine.exec(this.url, { sandbox: this.sandbox, version: this.version, command: t || this.command, files: { "": e, ...s } });
            }
            async prepare(t) {
                if (!this.template) return t;
                let e = "##CODE##",
                    [s, i] = await $(this.template, st);
                return (t = i.replace(e, t)), t;
            }
            async loadFiles() {
                if (!this.files) return {};
                let t = {};
                for (let e of this.files) {
                    let [s, i] = await $(e, it);
                    t[s] = i;
                }
                return t;
            }
        };
    async function $(n, t) {
        if (n[0] == "#") {
            let o = n.slice(1),
                a = document.getElementById(o);
            if (!a) throw new Error(`element ${n} not found`);
            return [o, a.text];
        }
        let e = n.split("/").pop(),
            s = await fetch(n);
        if (s.status != 200) throw new Error(`file ${n} not found`);
        let i = await t(s);
        return [e, i];
    }
    async function st(n) {
        return await n.text();
    }
    async function it(n) {
        if (n.headers.get("content-type") == "application/octet-stream") {
            let e = await n.blob();
            return await ot(e);
        } else return await n.text();
    }
    function ot(n) {
        return new Promise((t) => {
            let e = new FileReader();
            e.readAsDataURL(n),
                (e.onloadend = function () {
                    t(e.result);
                });
        });
    }
    var rt = { codapi: k, browser: M };
    window.Codapi = window.Codapi || {};
    window.Codapi.engines = { ...window.Codapi.engines, ...rt };
    var at = 4,
        ct = { fallback: "\u2718 Failed, using fallback" },
        d = { unknown: "unknown", running: "running", failed: "failed", succeded: "succeded" },
        g = { off: "off", basic: "basic", external: "external" },
        F = document.createElement("template");
    F.innerHTML = `
<codapi-toolbar></codapi-toolbar>
<codapi-output hidden></codapi-output>
`;
    var x = class extends HTMLElement {
            constructor() {
                super(), (this.ready = !1), (this.executor = null), (this.snippet = null), (this.toolbar = null), (this.output = null), (this.fallback = null);
            }
            connectedCallback() {
                if (this.ready) return;
                let t = parseInt(this.getAttribute("init-delay"), 10) || 0;
                dt(() => {
                    this.init(), this.render(), this.listen(), (this.ready = !0), this.dispatchEvent(new Event("load"));
                }, t);
            }
            init() {
                let t = this.getAttribute("files");
                (this.executor = new b({
                    engine: this.getAttribute("engine"),
                    sandbox: this.getAttribute("sandbox"),
                    command: this.getAttribute("command"),
                    url: this.getAttribute("url"),
                    template: this.getAttribute("template"),
                    files: t ? t.split(" ") : null,
                })),
                    (this.dependsOn = this.getAttribute("depends-on")),
                    (this.state = d.unknown);
            }
            render() {
                this.appendChild(F.content.cloneNode(!0));
                let t = this.findCodeElement();
                (this.snippet = new v(t, this.editor, this.execute.bind(this))), (this.toolbar = this.querySelector("codapi-toolbar"));
                let e = this.getAttribute("actions");
                this.toolbar.addActions(e ? e.split(" ") : null);
                let s = this.toolbar.querySelector("codapi-status");
                this.hasAttribute("status-running") && s.setAttribute("running", this.getAttribute("status-running")),
                    this.hasAttribute("status-failed") && s.setAttribute("failed", this.getAttribute("status-failed")),
                    this.hasAttribute("status-done") && s.setAttribute("done", this.getAttribute("status-done")),
                    (this.output = this.querySelector("codapi-output")),
                    this.hasAttribute("output") && (this.fallback = this.extractFallback(this.getAttribute("output")));
            }
            listen() {
                this.toolbar.addEventListener("run", (t) => {
                    this.execute();
                }),
                    this.toolbar.addEventListener("command", (t) => {
                        this.execute(t.detail);
                    }),
                    this.toolbar.addEventListener("event", (t) => {
                        this.dispatchEvent(new Event(t.detail));
                    }),
                    this.editor == g.basic &&
                        ((this.toolbar.editable = !0),
                        this.toolbar.addEventListener("edit", (t) => {
                            this.snippet.focusEnd();
                        })),
                    this.snippet.addEventListener("hide", (t) => {
                        this.output.hide();
                    });
            }
            findCodeElement() {
                if (!this.selector) {
                    let e = this.previousElementSibling;
                    return e.querySelector("code") || e;
                }
                let t;
                if (this.selector.startsWith("@prev")) {
                    let e = this.previousElementSibling,
                        [s, i] = r.cut(this.selector, " ");
                    t = e.querySelector(i);
                } else t = document.querySelector(this.selector);
                if (!t) throw Error(`element not found: ${this.selector}`);
                return t;
            }
            extractFallback(t) {
                let e = this.findOutputElement(t),
                    i = (e.querySelector("code") || e).innerText.trim();
                return e.parentElement.removeChild(e), { ok: !1, duration: 0, stdout: i, stderr: "" };
            }
            findOutputElement(t) {
                if (!t) return this.nextElementSibling;
                let e;
                if (t.startsWith("@next")) {
                    let s = this.nextElementSibling,
                        [i, o] = r.cut(o, " ");
                    e = s.querySelector(o);
                } else e = document.querySelector(t);
                if (!e) throw Error(`element not found: ${t}`);
                return e;
            }
            async execute(t = void 0) {
                if (!this.code) {
                    this.output.showMessage("(empty)");
                    return;
                }
                try {
                    let e = ut(this);
                    this.dispatchEvent(new CustomEvent("execute", { detail: e })), (this.state = d.running), this.toolbar.showRunning(), this.output.fadeOut();
                    let s = await this.executor.execute(t, e);
                    (this.state = s.ok ? d.succeded : d.failed), this.toolbar.showFinished(s), this.output.showResult(s), this.dispatchEvent(new CustomEvent("result", { detail: s }));
                } catch (e) {
                    this.fallback ? (this.toolbar.showStatus(ct.fallback), this.output.showResult(this.fallback)) : (this.toolbar.showFinished({}), this.output.showMessage(e.message)),
                        console.error(e),
                        (this.state = d.failed),
                        this.dispatchEvent(new CustomEvent("error", { detail: e }));
                } finally {
                    this.output.fadeIn();
                }
            }
            showStatus(t) {
                this.toolbar.showStatus(t);
            }
            get selector() {
                return this.getAttribute("selector");
            }
            get editor() {
                return this.getAttribute("editor") || g.off;
            }
            get code() {
                return this.snippet.value;
            }
            set code(t) {
                this.snippet.value = t;
            }
            get state() {
                return this.getAttribute("state");
            }
            set state(t) {
                this.setAttribute("state", t);
            }
        },
        v = class extends EventTarget {
            constructor(t, e, s) {
                super(), (this.el = t), (this.mode = e), (this.executeFunc = s), this.listen();
            }
            addEventListenerAndRecord(e, f) {
                if (this.eventListeners[e] == null) {
                    this.eventListeners[e] = [];
                }
                this.eventListeners[e].push(f);
                this.el.addEventListener(e, f);
            }
            listen() {
                this.eventListeners = {};
                if (this.mode != g.off) {
                    if (this.mode == g.external) {
                        this.addEventListenerAndRecord("keydown", this.handleExecute.bind(this));
                        return;
                    }
                    (this.el.contentEditable = "true"),
                        this.addEventListenerAndRecord("keydown", this.handleIndent.bind(this)),
                        this.addEventListenerAndRecord("keydown", this.handleHide.bind(this)),
                        this.addEventListenerAndRecord("keydown", this.handleExecute.bind(this)),
                        this.addEventListenerAndRecord("paste", this.onPaste.bind(this)),
                        (this.onFocus = this.initEditor.bind(this)),
                        this.addEventListenerAndRecord("focus", this.onFocus);
                }
            }
            unlisten() {
                for (var e of Object.keys(this.eventListeners)) {
                    for (var f of this.eventListeners[e]) {
                        this.el.removeEventListener(e, f);
                    }
                }
            }
            initEditor(t) {
                let e = t.target;
                e.innerHTML.startsWith('<span class="line">') || e.innerHTML.startsWith('<span style="display:flex')
                    ? (e.innerText = e.innerText.replace(
                          /\n\n/g,
                          `
`
                      ))
                    : e.innerHTML.includes("</span>") && (e.innerText = e.innerText),
                    e.removeEventListener("focus", this.onFocus),
                    delete this.onFocus;
            }
            handleIndent(t) {
                t.key == "Tab" && (t.preventDefault(), document.execCommand("insertHTML", !1, " ".repeat(at)));
            }
            handleHide(t) {
                t.key == "Escape" && (t.preventDefault(), this.dispatchEvent(new Event("hide")));
            }
            handleExecute(t) {
                (!t.ctrlKey && !t.metaKey) || (t.keyCode != 10 && t.keyCode != 13) || (t.preventDefault(), this.executeFunc());
            }
            onPaste(t) {
                t.preventDefault();
                let e = (t.originalEvent || t).clipboardData.getData("text/plain");
                document.execCommand("insertText", !1, e);
            }
            focusEnd() {
                this.el.focus();
                let t = window.getSelection();
                t.selectAllChildren(this.el), t.collapseToEnd();
            }
            get value() {
                return this.el.innerText.trim().replace(/[\u00A0]/g, " ");
            }
            set value(t) {
                this.el.innerHTML = r.sanitize(t);
            }
        };
    function ut(n) {
        let t = n.code,
            e = n.dependsOn ? n.dependsOn.split(" ") : [];
        for (let s of e) {
            let i = document.getElementById(s);
            if (!i) throw new Error(`#${s} dependency not found`);
            (t =
                i.code +
                `
` +
                t),
                i.dependsOn && e.push(...i.dependsOn.split(" ").filter((o) => !e.includes(o)));
        }
        return t;
    }
    function dt(n, t) {
        if (t <= 0) {
            n();
            return;
        }
        setTimeout(n, t);
    }
    window.customElements.get("codapi-snippet") ||
        (
            (window.CodapiSnippet = x),
            customElements.define("codapi-toolbar", f),
            customElements.define("codapi-status", p),
            customElements.define("codapi-output", m),
            customElements.define("codapi-snippet", x)
        );
}
codapi_main();
