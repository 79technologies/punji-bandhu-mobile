# Play Store listing — Punji Bandhu

Copy-paste source for the Play Console listing. Keep this in sync with
`app/about.tsx` and `docs/privacy-policy.html` — if any of the three disagree about
what the app collects, that inconsistency is what gets flagged.

---

## App details

| Field | Value |
|---|---|
| App name (max 30) | `Punji Bandhu: Stock Value` (25 chars) |
| Package | `com.punjibandhu.app` |
| Category | Finance |
| Contact email | madhu@79technologies.com |
| Privacy policy URL | https://punji-bandhu.79technologies.com/privacy |
| Ads | No ads |
| In-app purchases | None |

If you'd rather keep the title purely brand, `Punji Bandhu` alone is safer — it just
gives up the "stock" keyword in search.

## Short description (max 80)

```
See what the stocks you own are worth. No login, no tracking.
```

61 characters.

## Full description (max 4000)

```
Punji Bandhu shows you what the stocks you already own are worth today.

Add a stock, enter how many shares you hold, and the app keeps the total up to
date. That is all it does. There is nothing to sign up for and nothing to learn.

BUILT FOR PEOPLE WHO FIND TRADING APPS OVERWHELMING

Most investing apps are built for traders — charts, order books, alerts, jargon.
If you simply want to know what your shares are worth without calling your
broker to ask, those apps get in your way.

Punji Bandhu does one thing. Large, clear text. Plain English. No clutter.

NO LOGIN, EVER

No phone number. No email. No OTP. No account of any kind. Open the app and
start adding your stocks straight away.

YOUR HOLDINGS STAY ON YOUR PHONE

The stocks you add and the quantities you hold are saved only on your own
device. They are never uploaded, never backed up to our servers, and we have no
way of reading them.

To show live prices, the app asks our price server for the price of each stock
symbol you have added — for example RELIANCE or TCS. That request never contains
how many shares you own, what they are worth, your name, or anything that
identifies you or your phone. Two people holding the same stocks send requests
we cannot tell apart.

NO TRACKING

No analytics. No advertising. No device identifiers. No third-party tracking of
any kind. We do not know who is using this app, and we do not want to.

WHAT YOU GET

• Your total portfolio value, updated through the trading day
• Today's change, in rupees and percent
• Each holding listed with its current price and value
• The last closing price when the market is shut
• Works the moment you open it — no setup, no account

IMPORTANT

Punji Bandhu is for information only. Nothing in this app is investment advice, a
recommendation, or an offer to buy or sell any security. Prices may be delayed
and may differ from the figures shown by your broker. Always confirm with your
broker before acting on anything you see here.

Punji Bandhu is not affiliated with, endorsed by, or connected to the NSE, the
BSE, SEBI, or any stockbroker. It cannot place trades and it never touches your
money or your demat account.
```

---

## Graphics

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG | `store/play-store-icon.png` — done |
| Feature graphic | 1024×500 PNG | `store/play-feature-graphic.png` — done |
| Phone screenshots | 2–8, min 320px, 9:16 | **you must capture these** |

### Screenshots — what to capture

Minimum two, but four is the practical floor for a credible listing. Capture at
1080×1920 on a real device with realistic holdings (not `TEST`/`ABC`):

1. Portfolio screen with 4–5 holdings and a healthy total value
2. The add-a-stock flow mid-search
3. Portfolio during market hours showing today's change
4. The About screen — it visibly makes the privacy claim, which helps review

Do not add marketing frames, device bezels, or claims that don't appear in the app.
Screenshots that promise features the app lacks are a rejection reason.

---

## App content declarations

### Data safety — declare NO data collected, NO data shared

This is the one to get right. The reasoning, so it can be defended if challenged:

Stock symbols *are* transmitted off the device, which normally counts as
collection. Google exempts **ephemeral processing** — data accessed only in
memory and retained no longer than needed to service the request. With nginx
access logging off for `/feed` and `/feed/eod`, symbols are never written to
disk, so the exemption applies and "no data collected" is accurate.

**This declaration is only true while logging stays off.** If access logging is
ever turned back on for those routes, the declaration becomes false and the app
is exposed to removal. Treat that nginx config as a compliance control, not a
preference — and re-check it after any server rebuild.

Answers:
- Does your app collect or share any of the required user data types? → **No**
- Is all data encrypted in transit? → N/A (nothing collected; the app is HTTPS-only regardless)
- Do you provide a way to request data deletion? → N/A (nothing is held; uninstall removes everything)

### Content rating (IARC questionnaire)
Straightforward — no violence, no sexual content, no profanity, no gambling or
simulated gambling, no user-to-user communication, no location sharing. Expect
Everyone / 3+.

### Target audience
Select **18 and over**. The app concerns personal investments, and staying out of
the 13–17 brackets keeps you clear of the Families policy and its extra
requirements, which you gain nothing from here.

### Financial features
The app is informational only: it cannot place trades, cannot move money, holds
no funds, touches no demat account, and gives no advice. Read the console options
carefully and pick the one meaning "no financial services provided."

Do **not** tick anything describing brokerage, trading, investment management, or
lending — you provide none of them, and over-declaring pulls you into
verification requirements (in India, licence documentation) you cannot satisfy.

### Other declarations
- Ads: **No**, the app contains no ads
- News app: **No**
- COVID-19 / contact tracing: **No**
- Government app: **No**
- Data deletion URL: not required — no account exists to delete

---

## Open item before public rollout

Market data is currently sourced from a broker API on a personal account and
served to anonymous users. See the release memo — this is a redistribution
exposure, not a review blocker. It will pass review and can fail later.
