# Ola 动画视频处理知识库

> KoalaPhD · Ola 学姐动画 MP4 → 透明 WebM 处理标准流程
> 用途：每次有新的 Kling/LibLibAI 生成的 MP4，按此流程处理并部署

## 一、整体流程
Kling MP4(纯色背景) → 采样四角判断背景色 → colorkey去背成透明VP9 WebM → 提取MP3音轨 → 上传Supabase(ola-assets/animations/) → 更新ola_assets表 → 前端OlaFloatingMascot播放

## 二、命名规范（最重要）
视频文件名必须 = asset_id = 静态图文件名（去扩展名）。
原因：视频播3次后切回同名静态图，名字不一致就报错/闪烁。

## 三、FFmpeg去背参数
白底（参数要强）：
ffmpeg -i in.mp4 -vf "colorkey=0xFBFBFB:0.35:0.20,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 1M out.webm
黑底：
ffmpeg -i in.mp4 -vf "colorkey=0x000000:0.30:0.15,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 1M out.webm
要点：-pix_fmt yuva420p 带alpha通道是透明关键；-auto-alt-ref 0 必须关否则透明失效。

## 四、提取音轨
ffmpeg -i in.mp4 -vn -c:a libmp3lame -q:a 4 out.mp3

## 五、Supabase上传
Bucket: ola-assets(public)，路径 animations/
WebM→video/webm，MP3→audio/mpeg
URL: https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/{asset_id}.webm

## 六、ola_assets表更新
video_url, audio_url, media_type='animation', play_mode
play_mode: idle/loop=循环(最多3次切静态图), action=播一次, emotion=播一次淡出

## 七、前端播放8个踩坑点
1. video不能用height:100%(父无高度会塌成0px)，用h-auto
2. 必须onCanPlay里强制play()，光autoPlay会静默失败
3. muted用HTML属性不用state
4. 有video_url只渲染video不渲染img(否则图片抢先)
5. 切换5秒冷却+action锁(避免2-3秒被换掉)
6. 循环上限3次后切同名静态图
7. key={videoUrl}强制重建元素
8. 默认静音+喇叭按钮，交互后可unmute

## 八、emotion_tag匹配
ola_assets的emotion_tag必须和ola-persona.ts定义的完全一致。
历史bug：DB存cozy/encouraging但AI返回neutral/happy→零匹配→动画不触发。
不要用category过滤。三层匹配：精确→关键词模糊→AI自选→默认neutral。

## 九、常见问题速查
动画不触发→emotion_tag不匹配
视频看不见→height:100%塌陷,改h-auto
视频不播→autoPlay失败,加play()
图片抢先→img和video同时渲染,改成只渲染video
刚出现就被换→无冷却,加5秒冷却
白边残留→用了黑底参数,白底改0xFBFBFB
透明失效→没关auto-alt-ref
