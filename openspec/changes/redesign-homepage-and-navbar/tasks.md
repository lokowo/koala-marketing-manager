## Tasks

- [x] Fix TopNavBar: change "首页" href from `/koala/discover` to `/koala/home`, add "博客" link (BookOpen icon) between "定价" and "我的", remove theme toggle button
- [x] Fix BottomTabBar: change "首页" href from `/koala/discover` to `/koala/home`, fix active state logic so center Ola button is only active on `/koala/chat` paths (not `/koala/home`)
- [x] Add theme toggle to my-profile page: import useTheme, add a settings section with light/dark/system segmented control
- [x] Add AI tools card grid section to HomeClient after Three Steps: 6 cards (AI 选校, 科研助手, AI 聊天, 套磁信生成, RP 助手, 模拟面试), 2-col mobile / 3-col desktop, each linking to `/koala/chat?mode=X`
- [x] Add pricing preview section to HomeClient after blog carousel: 3 credit packs (入门 50积分 AUD 4.99, 标准 120积分 AUD 9.99, 专业 280积分 AUD 19.99) with "查看完整定价 →" link to `/koala/pricing`
- [x] Add footer section to HomeClient at bottom: "© 2026 Koala PhD 考拉博士", contact email, WeChat, legal links, brand positioning
- [x] Reorder homepage sections: Hero → Three Steps → AI Tools → Research Areas → Hot Professors → Blog Carousel → Pricing Preview → Bottom CTA → Footer
- [x] Run `npm run build` to verify no errors
