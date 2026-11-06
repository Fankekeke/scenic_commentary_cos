import json
import urllib.parse
import urllib.request

KEY = "04e01085b5de84cd79a80707604c795e"
ORIGIN = "116.281801,40.043007"
DEST = "116.285056,40.049829"
TS = 1792983600


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        return resp.read().decode("utf-8")


def probe(name, base, params):
    url = base + "?key=" + KEY + "&" + urllib.parse.urlencode(params)
    try:
        body = get(url)
        print(name, "->", body[:260].replace("\n", " "))
    except Exception as e:
        print(name, "-> ERROR", e)


pack = {
    "origin": ORIGIN,
    "destination": DEST,
    "departure_time": TS,
    "routeplan_type": "1",
    "need_polyline": True,
}
pack2 = dict(pack, need_polyline=False, eta_strategy=0)

probe("walkroute 2-packs(legacy)", "https://lbs.xiaojukeji.com/api/v2/walkroute",
      {"packs": json.dumps([pack2, pack], separators=(",", ":"))})
probe("walkroute origin/dest", "https://lbs.xiaojukeji.com/api/v2/walkroute",
      {"origin": ORIGIN, "destination": DEST})
probe("routeplanv3 packs", "https://lbs.xiaojukeji.com/api/v2/routeplanv3",
      {"packs": json.dumps([pack2, pack], separators=(",", ":"))})
