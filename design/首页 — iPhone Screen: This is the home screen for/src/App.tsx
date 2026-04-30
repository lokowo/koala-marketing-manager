import { useEffect } from "react";
import {
  ArrowRight,
  BatteryFull,
  Bell,
  BookOpen,
  ChevronRight,
  Home,
  MessageCircle,
  Signal,
  Star,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";

export default function App() {
  return (
    <div>
      <div
        className="text-neutral-950 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible"
        style={{ backgroundColor: "#faf6ec" }}
        data-id="da8afb87-ab2e-5c3e-9248-375652b14bfd"
      >
        <div
          className="font-semibold text-xs leading-4 flex px-6 pt-3 pb-1 justify-between items-center"
          style={{ color: "#1a2332" }}
          data-id="dfc10fc9-5ad7-56be-90ce-ef27fe9d4f0e"
        >
          <span data-id="acf31f4c-5b97-5bfd-b59f-47b762d9b74c">9:41</span>
          <div
            className="flex items-center gap-1"
            data-id="9e81eb89-5a39-51e1-a3d2-9ff8976599b5"
          >
            <Signal
              className="size-3.5"
              data-id="3ed3c723-aff3-5fca-a680-b7545fd54188"
            />
            <Wifi
              className="size-3.5"
              data-id="6b43632e-7b18-5729-9728-97f2f27c6d89"
            />
            <BatteryFull
              className="size-4"
              data-id="19be3b32-fbed-552c-a766-55af6acd9c0c"
            />
          </div>
        </div>
        <header
          className="flex px-6 pt-4 pb-2 justify-between items-center"
          data-id="2277e592-dd2b-5d56-bd11-a4b87d3505dc"
        >
          <div className="w-8" data-id="77ee470b-0be2-579e-ae14-749772c3f25e" />
          <div
            className="flex items-center gap-2"
            data-id="b537da85-34d7-52c7-b6d0-2f58cee381aa"
          >
            <div
              className="size-8 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#1a2332" }}
              data-id="f9ce1a3b-b7f8-56db-819f-8284eca1156d"
            >
              <span
                className="text-base leading-6"
                data-id="805350c7-4e11-5237-8ab9-c34fd51f1982"
              >
                🐨
              </span>
            </div>
            <span
              className="font-bold text-base leading-6 tracking-tight"
              style={{ color: "#1a2332" }}
              data-id="e15aa78e-a3d1-5a94-89d1-c3d47131e972"
            >
              考拉学长
            </span>
          </div>
          <button
            className="relative size-9 flex justify-center items-center"
            data-id="15687039-4039-5fee-b4d2-9310cb3cce60"
          >
            <Bell
              className="size-5"
              style={{ color: "#1a2332" }}
              data-id="cbe0ab85-eb40-5545-967b-6387a6b37942"
            />
            <span
              className="size-2 rounded-full absolute right-1 top-1"
              style={{ backgroundColor: "#c4a050" }}
              data-id="ce6359aa-b927-5c34-8f78-d0755b541b97"
            />
          </button>
        </header>
        <main
          className="flex px-6 pt-4 pb-32 flex-col gap-6"
          data-id="40d856a8-29f1-5ba8-8c60-3f392d6b63e5"
        >
          <button
            className="rounded-2xl flex p-6 justify-between items-center w-full"
            style={{
              backgroundColor: "#1a2332",
              boxShadow: "0 10px 30px -8px rgba(196,160,80,0.45)",
            }}
            data-id="296b67eb-a908-5f53-b698-28547e979e57"
          >
            <div
              className="flex flex-col items-start gap-1"
              data-id="af702619-6b15-59f1-b054-6579e50bd55f"
            >
              <span
                className="font-medium opacity-70 text-xs leading-4"
                style={{ color: "#c4a050" }}
                data-id="62976581-83cf-56d5-b622-13b87b77adcf"
              >
                AI 智能助手 · 24/7 在线
              </span>
              <span
                className="font-bold text-lg leading-7"
                style={{ color: "#c4a050" }}
                data-id="c24b55cb-7891-54df-8a20-1004aa5d09ba"
              >
                和考拉学长开始对话 🐨
              </span>
            </div>
            <div
              className="size-10 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "rgba(196,160,80,0.15)" }}
              data-id="800da607-304d-5d50-9099-210ba4ac1454"
            >
              <ArrowRight
                className="size-5"
                style={{ color: "#c4a050" }}
                data-id="80104667-9ab1-56bf-9fb4-3d2b0d9c16a4"
              />
            </div>
          </button>
          <section
            className="flex flex-col gap-4"
            data-id="898acf75-bab3-5687-9d39-9f7e352880ac"
          >
            <div
              className="flex justify-between items-center"
              data-id="8cc4a528-7cfe-592e-baa6-adf57da9a257"
            >
              <h2
                className="font-bold text-lg leading-7"
                style={{ color: "#1a2332" }}
                data-id="5054b3ae-0c30-5d79-afa2-2bb0bedd2bbf"
              >
                推荐教授
              </h2>
              <a
                className="font-semibold text-xs leading-4 flex items-center gap-1"
                style={{ color: "#c4a050" }}
                data-id="f63be3fd-3dfb-58a5-bb1f-2dc1076062f0"
              >
                查看全部
                <ChevronRight
                  className="size-3"
                  data-id="d4505c84-6e15-5cfe-8634-e4065f90ae7d"
                />
              </a>
            </div>
            <div
              className="overflow-x-auto flex -mx-6 px-6 pb-2 gap-4"
              data-id="3e67df75-70c5-5c18-8284-f2c44114076c"
            >
              <div
                className="shrink-0 rounded-2xl bg-white flex p-4 flex-col items-center gap-2 w-44"
                style={{ boxShadow: "0 6px 20px -8px rgba(196,160,80,0.35)" }}
                data-id="774ac857-8d59-59ab-976a-c87ce3e6c308"
              >
                <div
                  className="size-16 ring-2 rounded-full overflow-hidden"
                  style={{ borderColor: "#c4a050" }}
                  data-id="a622ded0-6794-5baa-9aeb-a37902811d2e"
                >
                  <img
                    alt="Prof Zhang"
                    className="object-cover w-full h-full"
                    data-authorname="Quan Jing"
                    data-authorurl="https://unsplash.com/@greedwolf97"
                    data-blurhash="LQF68|00-;D%xuIUIUof4nxuofxu"
                    data-photoid="obDRJQRdQEo"
                    src="https://images.unsplash.com/photo-1708677131966-2445ba586d2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjBwb3J0cmFpdCUyMGFzaWFuJTIwbWFufGVufDF8Mnx8fDE3Nzc0MTc1Njd8MA&ixlib=rb-4.1.0&q=80&w=400"
                    data-id="012cc8ca-f2a3-507f-9f9e-02437e177bb5"
                  />
                </div>
                <span
                  className="font-bold text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="a3ce7a8f-d3ff-5bba-9726-3c930ae8812d"
                >
                  Prof. Zhang Wei
                </span>
                <span
                  className="text-center text-[10px]"
                  style={{ color: "#8a8a8a" }}
                  data-id="50d42b41-f302-5ada-a402-c5a31428cdaa"
                >
                  Stanford University
                  <br data-id="5f93d8d2-dd67-5aef-839a-78e862141365" />
                  Computer Science
                </span>
                <div
                  className="flex items-center gap-0.5"
                  data-id="7a4443d8-3fca-5163-bef0-23c67b598966"
                >
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="384fd957-5f9d-50c3-8efc-7874536e784e"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="23d5457c-6729-50f0-9f13-88276bc0b041"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="45b092eb-0bbd-5497-b15b-d8c7fc2ac207"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="c5273653-509c-5c94-8546-e108a25bf09f"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="4fdc89a2-1a65-5dc8-8e9b-9610449fd7d8"
                  />
                  <span
                    className="font-semibold text-[10px] ml-1"
                    style={{ color: "#1a2332" }}
                    data-id="99f3f5ce-b65f-517c-a081-60f54a4e311c"
                  >
                    4.9
                  </span>
                </div>
              </div>
              <div
                className="shrink-0 rounded-2xl bg-white flex p-4 flex-col items-center gap-2 w-44"
                style={{ boxShadow: "0 6px 20px -8px rgba(196,160,80,0.35)" }}
                data-id="e0a1f8d7-ba0b-5fbd-9d59-88d6363eaed4"
              >
                <div
                  className="size-16 ring-2 rounded-full overflow-hidden"
                  style={{ borderColor: "#c4a050" }}
                  data-id="eca79f5e-15ae-51a9-b366-27dc5cb75ee7"
                >
                  <img
                    alt="Prof Li"
                    className="object-cover w-full h-full"
                    data-authorname="Richard Williams"
                    data-authorurl="https://unsplash.com/@richardjw"
                    data-blurhash="LJF62$0Kxs-:kBoet6Ioaes;M|t7"
                    data-photoid="uhYrAm1w0dc"
                    src="https://images.unsplash.com/photo-1760985050183-9b405e8a794e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjBwb3J0cmFpdCUyMHdvbWFuJTIwYWNhZGVtaWN8ZW58MXwyfHx8MTc3NzQxNzU2N3ww&ixlib=rb-4.1.0&q=80&w=400"
                    data-id="f1e0d388-bf99-55cb-9caf-1e9fd18c58f1"
                  />
                </div>
                <span
                  className="font-bold text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="f6142710-ed6a-5633-a7a4-e17884cd52aa"
                >
                  Prof. Li Mei
                </span>
                <span
                  className="text-center text-[10px]"
                  style={{ color: "#8a8a8a" }}
                  data-id="44c2732e-ca59-5dad-9737-2b0558de4281"
                >
                  MIT
                  <br data-id="d1bb3b7f-a029-58a9-81dd-f7dc103b8ce8" />
                  Economics
                </span>
                <div
                  className="flex items-center gap-0.5"
                  data-id="e273a805-13cd-59cb-8952-2bdeac748142"
                >
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="ab701457-22f0-5956-987a-997713375f0a"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="314f1555-112e-5c4c-8ccf-d4ce818a9ba4"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="8956ed55-1d50-5dba-b9ae-ab6bdef90db1"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="9ec6b883-780d-5c64-a30a-368fc9f84907"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="75cad351-7f62-5403-b789-1b8e92282ba5"
                  />
                  <span
                    className="font-semibold text-[10px] ml-1"
                    style={{ color: "#1a2332" }}
                    data-id="60cab203-1be7-5b8c-b9a4-d20741a05d97"
                  >
                    4.8
                  </span>
                </div>
              </div>
              <div
                className="shrink-0 rounded-2xl bg-white flex p-4 flex-col items-center gap-2 w-44"
                style={{ boxShadow: "0 6px 20px -8px rgba(196,160,80,0.35)" }}
                data-id="c1c6bc61-e89a-55d6-8446-ba202e1fecca"
              >
                <div
                  className="size-16 ring-2 rounded-full overflow-hidden"
                  style={{ borderColor: "#c4a050" }}
                  data-id="69c8a4e4-4637-5166-abd9-71c1399dade6"
                >
                  <img
                    alt="Prof Chen"
                    className="object-cover w-full h-full"
                    data-authorname="Oluwatobi"
                    data-authorurl="https://unsplash.com/@oluwatobisimii"
                    data-blurhash="LTH_Y{IUtlxa4mtRWBWB%#WAr?R+"
                    data-photoid="K8kDDGljn90"
                    src="https://images.unsplash.com/photo-1678282955808-de92256dbd59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjBoZWFkc2hvdCUyMG1hbiUyMGdsYXNzZXN8ZW58MXwyfHx8MTc3NzQxNzU2N3ww&ixlib=rb-4.1.0&q=80&w=400"
                    data-id="5abcc5ee-1b69-5cfa-af95-a49fbc0fa487"
                  />
                </div>
                <span
                  className="font-bold text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="131b9732-048d-503d-8e1d-b280c151ecf4"
                >
                  Prof. Chen Hao
                </span>
                <span
                  className="text-center text-[10px]"
                  style={{ color: "#8a8a8a" }}
                  data-id="b597a280-94ea-5f96-a596-676f21c97c20"
                >
                  Harvard University
                  <br data-id="2b4ab4c6-47fb-5d36-9eca-5a3b18cc1632" />
                  Physics
                </span>
                <div
                  className="flex items-center gap-0.5"
                  data-id="887b63ca-7129-5746-b2b2-68c20069ef09"
                >
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="785e7be1-6d0b-547f-8f94-1a8aba15624c"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="25a1cfeb-9931-5a49-a118-30f005450a8c"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="7fdf71ef-00ee-53ee-bd4a-bc283e457674"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="1e624d3d-5eeb-5bf1-b28e-7304737a1a12"
                  />
                  <Star
                    className="size-3 fill-current"
                    style={{ color: "#c4a050" }}
                    data-id="2cdb2a54-fc7f-5509-a19e-2815087c408b"
                  />
                  <span
                    className="font-semibold text-[10px] ml-1"
                    style={{ color: "#1a2332" }}
                    data-id="915145b4-361f-5e2d-b890-fa08cbd6bf68"
                  >
                    4.7
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section
            className="flex flex-col gap-4"
            data-id="e348689a-d3fe-55cb-9b39-888f1afada42"
          >
            <div
              className="flex justify-between items-center"
              data-id="e062e260-1c87-5703-ada7-6fed6ac06ac0"
            >
              <h2
                className="font-bold text-lg leading-7"
                style={{ color: "#1a2332" }}
                data-id="c40da485-43c5-5526-9987-a5d595108259"
              >
                最新博客
              </h2>
              <a
                className="font-semibold text-xs leading-4 flex items-center gap-1"
                style={{ color: "#c4a050" }}
                data-id="3341ab3c-3ea8-5cb0-ad13-84ddfb22a941"
              >
                更多
                <ChevronRight
                  className="size-3"
                  data-id="4483f27b-7275-5eb3-a394-068589e4d15c"
                />
              </a>
            </div>
            <div
              className="flex flex-col gap-4"
              data-id="e880c518-6abc-5a6e-b2c8-77e5daeec8b5"
            >
              <div
                className="rounded-2xl bg-white flex p-4 flex-col gap-2"
                style={{ boxShadow: "0 6px 20px -8px rgba(196,160,80,0.35)" }}
                data-id="d623d868-0666-551c-a89e-bf6b52455237"
              >
                <div
                  className="flex justify-between items-center"
                  data-id="07366037-fc11-578a-9098-d43086a79639"
                >
                  <span
                    className="font-semibold rounded-full text-white text-[10px] px-2 py-1"
                    style={{ backgroundColor: "#c4a050" }}
                    data-id="bc35e94d-5896-5c22-86bf-6fdaa26b13ba"
                  >
                    留学申请
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "#b0b0b0" }}
                    data-id="fc28aec2-7405-5453-9d5f-06f0674b5596"
                  >
                    2024-03-15
                  </span>
                </div>
                <h3
                  className="leading-snug font-bold text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="1116fdef-88da-5638-916e-8fac043ebd3a"
                >
                  2024 年 CS 硕士申请：如何写出打动招生官的 SOP
                </h3>
                <p
                  className="leading-relaxed text-xs leading-4"
                  style={{ color: "#8a8a8a" }}
                  data-id="0231d858-0797-58e5-bfcb-81bace4f4dbd"
                >
                  从结构、故事到细节打磨，这篇深度指南将帮你把个人陈述写出层次感与说服力，避开常见误区...
                </p>
              </div>
              <div
                className="rounded-2xl bg-white flex p-4 flex-col gap-2"
                style={{ boxShadow: "0 6px 20px -8px rgba(196,160,80,0.35)" }}
                data-id="625b714b-f4b3-54b5-b80b-700e90e24a9b"
              >
                <div
                  className="flex justify-between items-center"
                  data-id="9894646c-1448-5847-bcc9-13e9ba8cac04"
                >
                  <span
                    className="font-semibold rounded-full text-white text-[10px] px-2 py-1"
                    style={{ backgroundColor: "#c4a050" }}
                    data-id="3ae9bcb9-9af8-5f0d-a73e-9caf2ba56abb"
                  >
                    选校攻略
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "#b0b0b0" }}
                    data-id="515ee5d9-8804-5695-8632-70d521725957"
                  >
                    2024-03-12
                  </span>
                </div>
                <h3
                  className="leading-snug font-bold text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="057cbce9-8504-5c78-89b4-e9de121ce362"
                >
                  美国 Top 30 商学院选校全解析：冲刺、匹配与保底
                </h3>
                <p
                  className="leading-relaxed text-xs leading-4"
                  style={{ color: "#8a8a8a" }}
                  data-id="034db44b-f345-514b-9152-781a04ab6c99"
                >
                  从 GMAT
                  分数线到校友资源，全面对比顶尖商学院特色，帮你制定精准选校策略...
                </p>
              </div>
            </div>
          </section>
        </main>
        <nav
          className="fixed bg-white border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex inset-x-0 bottom-0 px-4 pt-2 pb-6 justify-around items-end"
          style={{ borderColor: "#f0e8d4" }}
          data-id="d5f38354-e9b8-5be8-862f-5e6e480d7b8c"
        >
          <button
            className="flex py-2 flex-col items-center gap-1 w-14"
            data-id="0fc0214a-0313-506f-9d83-0c4428141c6c"
          >
            <Home
              className="size-5"
              style={{ color: "#c4a050" }}
              data-id="f7c4af99-59a7-579e-8b81-25609b9701ec"
            />
            <span
              className="font-semibold text-[10px]"
              style={{ color: "#c4a050" }}
              data-id="7f7ed84f-76d9-5ae7-ad18-b2bc8814c13c"
            >
              首页
            </span>
          </button>
          <button
            className="flex py-2 flex-col items-center gap-1 w-14"
            data-id="2a860742-b8ff-51fb-bea7-1bbabb3e3e8c"
          >
            <Users
              className="size-5"
              style={{ color: "#6b6b6b" }}
              data-id="a1a49c02-9720-574b-9d71-2333ba69f6a8"
            />
            <span
              className="text-[10px]"
              style={{ color: "#6b6b6b" }}
              data-id="99a1dfcb-0270-5fe5-9abd-a51bbe05d534"
            >
              教授
            </span>
          </button>
          <button
            className="flex -mt-8 flex-col items-center gap-1 w-16"
            data-id="968e8abd-cf01-5027-8dba-b0b138fe52c6"
          >
            <div
              className="size-14 rounded-full flex justify-center items-center"
              style={{
                backgroundColor: "#c4a050",
                boxShadow: "0 8px 20px -4px rgba(196,160,80,0.5)",
              }}
              data-id="218a9fa0-078e-5269-bf89-52c247d113c2"
            >
              <MessageCircle
                className="size-6 text-white"
                data-id="64f16c73-e640-54a6-a5e5-8fcc95b49c18"
              />
            </div>
            <span
              className="font-semibold text-[10px]"
              style={{ color: "#1a2332" }}
              data-id="4675d78a-b199-57a0-b337-b5590d46e508"
            >
              Koala
            </span>
          </button>
          <button
            className="flex py-2 flex-col items-center gap-1 w-14"
            data-id="eb5a0a4e-87c0-5dbc-8e76-e317164788be"
          >
            <BookOpen
              className="size-5"
              style={{ color: "#6b6b6b" }}
              data-id="32f75356-e548-53c1-b1f9-a67c0f1766e1"
            />
            <span
              className="text-[10px]"
              style={{ color: "#6b6b6b" }}
              data-id="21210478-9027-51b5-9ee4-17f525500780"
            >
              博客
            </span>
          </button>
          <button
            className="flex py-2 flex-col items-center gap-1 w-14"
            data-id="1e07f0ee-7919-531c-8ff5-8a1f1e530718"
          >
            <Wrench
              className="size-5"
              style={{ color: "#6b6b6b" }}
              data-id="c93eb8a0-e38b-58b8-aefc-7ea5519f2d25"
            />
            <span
              className="text-[10px]"
              style={{ color: "#6b6b6b" }}
              data-id="7a4ce192-7671-562c-abcb-19e0ad191f59"
            >
              工具
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
