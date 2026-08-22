# 내 사진 등록 방법 (PC에서)

1. 아래 폴더 중 사진 종류에 맞는 폴더에 사진 파일(jpg/png)을 넣습니다.

   `photos/인물`, `photos/풍경`, `photos/여행`, `photos/스트리트`, `photos/음식`,
   `photos/반려동물`, `photos/야경`, `photos/이벤트`, `photos/건축`, `photos/스포츠`, `photos/셀프사진`

2. (최초 1회) 프로젝트 루트 폴더에서 아래 명령어를 실행합니다.

   ```
   npm install
   ```

3. 사진을 넣은 뒤 아래 명령어를 실행하면 폰에서 빠르게 보이도록 썸네일이 자동 생성되고
   목록(`photos/manifest.json`)이 갱신됩니다.

   ```
   npm run build-photos
   ```

4. 변경사항을 커밋 후 푸시하면 배포되어 폰(설치된 앱)에서도 "내 사진" 메뉴에 바로 나타납니다.

   ```
   git add photos
   git commit -m "사진 추가"
   git push
   ```

원본 사진은 `photos/<카테고리>/`에 그대로 보관되고, 목록 화면에서는 용량이 작은 썸네일
(`photos/thumbs/<카테고리>/`)을 사용해 폰에서도 빠르게 로딩됩니다. 사진을 탭하면 원본 화질로 볼 수 있어요.
