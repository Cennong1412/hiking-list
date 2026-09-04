// "맛집 리스트/korea_restaurants_all.json" (원본, Claude 채팅에서 정리된 데이터)을
// 앱이 쓰는 "restaurants_all.json"(정규화 + 확인여부 플래그 포함)으로 변환한다.
// 원본 파일을 새로 받거나 주소/전화번호를 채워넣은 뒤에는 다시 실행해서 갱신:
//   node scripts/build-restaurants.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "맛집 리스트", "korea_restaurants_all.json");
const OUT = path.join(ROOT, "restaurants_all.json");

const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));

const CATEGORY_ICON = {
  "한식": "🍚", "중식": "🥢", "일식": "🍣", "양식": "🍝", "경양식": "🍝",
  "서양음식": "🍝", "빵": "🥐", "제과": "🥐", "카페": "☕",
};
function mainCategory(raw){
  return (raw || "").split("(")[0].split("/")[0].trim();
}
function iconFor(raw){
  return CATEGORY_ICON[mainCategory(raw)] || "🌏";
}
// province+gu+식당이름 기준 고정 id (재생성해도 안 바뀜 -> 앱에서 로컬 수정값을 매칭하는 키로 사용)
function makeId(province, gu, name){
  return crypto.createHash("md5").update(`${province}|${gu}|${name}`).digest("hex").slice(0, 12);
}

let total = 0;
let addressUnverified = 0;
let phoneUnverified = 0;
const regionCounts = {};
const categorySet = new Set();

const regions = Object.keys(raw).map(provinceName => {
  const provinceObj = raw[provinceName];
  let provinceTotal = 0;
  const subregions = Object.keys(provinceObj).map(guName => {
    const list = provinceObj[guName];
    provinceTotal += list.length;
    total += list.length;
    const restaurants = list.map(r => {
      const address = (r["주소"] || "").trim();
      const phone = (r["전화번호"] || "").trim();
      const menu = (r["주요메뉴"] || "").trim();
      const addressVerified = !!address && !address.includes("확인 필요");
      const phoneVerified = !!phone && phone !== "확인 필요";
      const menuVerified = !!menu && !menu.includes("확인 필요");
      if(!addressVerified) addressUnverified++;
      if(!phoneVerified) phoneUnverified++;
      const category = r["음식종류"] || "";
      categorySet.add(mainCategory(category));
      return {
        id: makeId(provinceName, guName, r["식당이름"] || ""),
        category,
        categoryIcon: iconFor(category),
        name: r["식당이름"] || "",
        menu,
        menuVerified,
        address,
        addressVerified,
        phone,
        phoneVerified
      };
    });
    return { name: guName, restaurants };
  });
  regionCounts[provinceName] = provinceTotal;
  return { region: provinceName, subregions };
});

const out = {
  meta: {
    generatedFor: "Claude Code 앱 등록용 (전국 시군구 맛집)",
    dietaryNote: "회(생선회) 메뉴는 수집 단계에서 제외",
    verifyNote: "주소/전화번호/메뉴가 확인되지 않은 항목은 addressVerified/phoneVerified/menuVerified가 false — UI에서 '정보 확인 중'으로 표시하고 임의로 채우지 않음",
    totalCount: total,
    regionCounts
  },
  regions
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log("총 식당 수:", total);
console.log("주소 미확인:", addressUnverified, `(${(addressUnverified/total*100).toFixed(1)}%)`);
console.log("전화번호 미확인:", phoneUnverified, `(${(phoneUnverified/total*100).toFixed(1)}%)`);
console.log("시/도별 개수:", regionCounts);
console.log("음식 대분류:", [...categorySet].sort());
console.log("저장 완료:", OUT);
