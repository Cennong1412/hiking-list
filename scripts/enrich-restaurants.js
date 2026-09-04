// 카카오 로컬 API로 "맛집 리스트/korea_restaurants_all.json"의 주소/전화번호 "확인 필요" 항목을 보완한다.
// - .kakao-api-key 파일에서 REST API 키를 읽음 (git에는 안 올라감)
// - 이름+시군구로 검색해서 음식점(FD6)/카페(CE7) 결과 중 "이름이 확실히 일치"하는 경우에만 채움
// - 애매하거나 매칭 안 되면 절대 임의로 채우지 않고 그대로 "확인 필요"로 둠
// - 실행 후 원본 파일을 덮어쓰기 전에 .bak으로 백업, 결과 로그를 enrich-log.json으로 저장
// 실행: node scripts/enrich-restaurants.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "맛집 리스트", "korea_restaurants_all.json");
const KEY_FILE = path.join(ROOT, ".kakao-api-key");
const LOG_FILE = path.join(ROOT, "맛집 리스트", "enrich-log.json");

if (!fs.existsSync(KEY_FILE)) {
  console.error(".kakao-api-key 파일이 없습니다.");
  process.exit(1);
}
const KAKAO_KEY = fs.readFileSync(KEY_FILE, "utf8").trim();

const FOOD_CATEGORIES = new Set(["FD6", "CE7"]);

function normalize(s) {
  return (s || "").replace(/\s+/g, "").replace(/[·・\-()]/g, "").toLowerCase();
}

async function searchKakao(query) {
  const url = "https://dapi.kakao.com/v2/local/search/keyword.json?query=" + encodeURIComponent(query);
  const res = await fetch(url, { headers: { Authorization: "KakaoAK " + KAKAO_KEY } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kakao API ${res.status}: ${text}`);
  }
  return res.json();
}

function pickMatch(documents, name, guName) {
  let results = documents.filter(d => FOOD_CATEGORIES.has(d.category_group_code));
  results = results.filter(d => (d.road_address_name + d.address_name).includes(guName));
  if (results.length === 0) return null;

  const nName = normalize(name);
  const exact = results.filter(d => normalize(d.place_name) === nName);
  if (exact.length >= 1) return exact[0];

  const partial = results.filter(d => {
    const nPlace = normalize(d.place_name);
    return nPlace.includes(nName) || nName.includes(nPlace);
  });
  if (partial.length === 1) return partial[0];

  return null; // 매칭 애매함 -> 보류
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));

  let checked = 0, addressFilled = 0, phoneFilled = 0, unresolved = 0, skipped = 0;
  const log = { filled: [], unresolved: [] };

  const provinces = Object.keys(raw);
  for (const province of provinces) {
    const gus = Object.keys(raw[province]);
    for (const gu of gus) {
      const list = raw[province][gu];
      for (const r of list) {
        const addr = (r["주소"] || "").trim();
        const phone = (r["전화번호"] || "").trim();
        const needAddr = !addr || addr.includes("확인 필요");
        const needPhone = !phone || phone === "확인 필요";
        if (!needAddr && !needPhone) { skipped++; continue; }

        checked++;
        const query = `${r["식당이름"]} ${gu}`;
        let data;
        try {
          data = await searchKakao(query);
        } catch (e) {
          console.error("검색 실패:", query, e.message);
          await sleep(300);
          continue;
        }
        const match = pickMatch(data.documents || [], r["식당이름"], gu);

        if (!match) {
          unresolved++;
          log.unresolved.push({ province, gu, name: r["식당이름"] });
        } else {
          const before = { addr, phone };
          if (needAddr) {
            const newAddr = match.road_address_name || match.address_name;
            if (newAddr) { r["주소"] = newAddr; addressFilled++; }
          }
          if (needPhone && match.phone) {
            r["전화번호"] = match.phone; phoneFilled++;
          }
          log.filled.push({ province, gu, name: r["식당이름"], before, after: { 주소: r["주소"], 전화번호: r["전화번호"] }, kakaoPlaceName: match.place_name });
        }

        await sleep(80); // 초당 요청 속도 제한
        if (checked % 50 === 0) console.log(`진행 ${checked}건 처리...`);
      }
    }
  }

  fs.copyFileSync(SRC, SRC + ".bak");
  fs.writeFileSync(SRC, JSON.stringify(raw, null, 2) + "\n", "utf8");
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + "\n", "utf8");

  console.log("---");
  console.log("보완 대상 확인:", checked, "(이미 완전한 항목 건너뜀:", skipped, ")");
  console.log("주소 채움:", addressFilled);
  console.log("전화번호 채움:", phoneFilled);
  console.log("매칭 실패(그대로 둠):", unresolved);
  console.log("원본 백업:", SRC + ".bak");
  console.log("상세 로그:", LOG_FILE);
}

main().catch(e => { console.error(e); process.exit(1); });
