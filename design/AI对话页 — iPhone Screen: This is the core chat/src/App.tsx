import { useEffect } from "react";
import {
  BatteryFull,
  BookOpen,
  Home,
  MessageCircle,
  PawPrint,
  Plus,
  Send,
  Settings,
  Signal,
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
        data-id="f0094782-7a0f-55c5-b1a4-fea76be3a687"
      >
        <div
          className="flex px-6 pt-3 pb-1 justify-between items-center"
          style={{ backgroundColor: "#1a2332" }}
          data-id="8ed5694b-cd56-50c6-ac16-a5a1a92ee546"
        >
          <span
            className="font-semibold text-xs leading-4"
            style={{ color: "#faf6ec" }}
            data-id="9a3978f9-e9b2-56a2-86f5-9282bdad0ea2"
          >
            9:41
          </span>
          <div
            className="flex items-center gap-1"
            style={{ color: "#faf6ec" }}
            data-id="fdf95dcc-c8a9-5bd1-8a65-5f7400b00b98"
          >
            <Signal
              className="size-3.5"
              data-id="c8a9af14-eb5e-5b52-83df-6464d30875df"
            />
            <Wifi
              className="size-3.5"
              data-id="26520ada-eec8-5310-abf9-95ff91a45a45"
            />
            <BatteryFull
              className="size-4"
              data-id="9ebaac78-bc9d-5721-8fb7-16c7568225cd"
            />
          </div>
        </div>
        <div
          className="flex px-4 py-3 justify-between items-center"
          style={{ backgroundColor: "#1a2332" }}
          data-id="46357abb-306d-5351-9298-497e6d0c52cd"
        >
          <div
            className="flex items-center gap-2"
            data-id="ae75557a-519b-57a2-adf9-251a52513799"
          >
            <div
              className="size-9 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#c4a050" }}
              data-id="2f78a696-34cb-589d-b832-3f834bc515d6"
            >
              <PawPrint
                className="size-5"
                style={{ color: "#1a2332" }}
                data-id="2b47d517-1bdb-5f0b-909d-5eb0bbcf6d21"
              />
            </div>
            <div
              className="flex flex-col"
              data-id="f0b4cdd1-3c6b-579c-bd7d-0cb5a3802f75"
            >
              <span
                className="font-bold text-base leading-6 tracking-wide"
                style={{ color: "#c4a050" }}
                data-id="c7adcdf3-50b0-59f0-9609-fc4c94f87ca2"
              >
                Koala Study Advisors
              </span>
              <span
                className="text-[10px]"
                style={{ color: "#c4a050cc" }}
                data-id="6596bc5f-7a31-50eb-99bb-93f439db09d1"
              >
                考拉学长 · 在线
              </span>
            </div>
          </div>
          <Settings
            className="size-5"
            style={{ color: "#c4a050" }}
            data-id="c209234a-60a4-51c0-80d9-e6379e015ab7"
          />
        </div>
        <div
          className="flex px-2 items-stretch"
          style={{ backgroundColor: "#f0e9d6" }}
          data-id="f3327440-4f13-5a5d-bff0-eb4a1ac5f27c"
        >
          <div
            className="flex pt-3 pb-2 flex-col items-center flex-1 gap-2"
            data-id="6e046126-d144-57f1-bc37-0d05c114c7ed"
          >
            <span
              className="font-bold text-sm leading-5"
              style={{ color: "#1a2332" }}
              data-id="1201af5d-ff17-5909-b35a-882b50d1ac84"
            >
              路径评估
            </span>
            <div
              className="rounded-full w-8 h-0.5"
              style={{ backgroundColor: "#c4a050" }}
              data-id="0b7f3b7f-d150-506c-a6f7-c1310eb188ad"
            />
          </div>
          <div
            className="flex pt-3 pb-2 flex-col items-center flex-1 gap-2"
            data-id="3fb72e7a-ee38-508a-8446-7cee8aa6216b"
          >
            <span
              className="text-sm leading-5"
              style={{ color: "#9a9285" }}
              data-id="cdb31adc-785b-5ee9-8acc-f3c1ab08f987"
            >
              科研深潜
            </span>
            <div
              className="w-8 h-0.5"
              data-id="bc8fe5a2-1fa2-5965-86d2-d3a78f8b816c"
            />
          </div>
          <div
            className="flex pt-3 pb-2 flex-col items-center flex-1 gap-2"
            data-id="75588736-4697-520b-a19d-07d9b48469a4"
          >
            <span
              className="text-sm leading-5"
              style={{ color: "#9a9285" }}
              data-id="fff14011-e7b1-5c88-ad5c-7108a5f41730"
            >
              陪伴
            </span>
            <div
              className="w-8 h-0.5"
              data-id="0ab90b59-c176-5037-b8e1-a22fac33810e"
            />
          </div>
          <div
            className="flex pt-3 pb-2 flex-col items-center flex-1 gap-2"
            data-id="c0be5403-a5d6-5e42-ae80-b01f6921124c"
          >
            <span
              className="text-sm leading-5"
              style={{ color: "#9a9285" }}
              data-id="0e4b957f-f1e7-5bc6-813c-006f0d04f453"
            >
              文案
            </span>
            <div
              className="w-8 h-0.5"
              data-id="e68e5a43-8f15-51c4-b349-3d370b6e3996"
            />
          </div>
        </div>
        <div
          className="flex p-4 flex-col gap-4"
          data-id="ddcb1b50-7237-5b8d-8832-2b64001557f0"
        >
          <div
            className="flex justify-center"
            data-id="564a391e-ea19-5033-80a6-27a6142110a6"
          >
            <span
              className="text-[10px] px-2"
              style={{ color: "#a89f8d" }}
              data-id="1eb2119b-3dd2-5f94-802c-61f4dce0bd7c"
            >
              今天 14:32
            </span>
          </div>
          <div
            className="flex items-end gap-2"
            data-id="3beca9d0-e06a-5605-9f6d-b75e2f76e5b0"
          >
            <div
              className="size-9 shrink-0 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#c4a050" }}
              data-id="15b7230a-cfa5-5c28-bf7a-336382f5665a"
            >
              <PawPrint
                className="size-5 text-white"
                data-id="57db0bca-9275-5dc9-8870-e8d9d8a8223d"
              />
            </div>
            <div
              className="max-w-[78%] flex flex-col gap-1"
              data-id="5fc32c0f-5b30-5111-9fe1-43a4daf1ce65"
            >
              <span
                className="text-[10px]"
                style={{ color: "#8a8270" }}
                data-id="22c251d4-35f2-5f58-a18c-dd11ae1814e0"
              >
                Koala学长
              </span>
              <div
                className="shadow-sm rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-white p-4"
                style={{ boxShadow: "0 2px 8px rgba(196,160,80,0.12)" }}
                data-id="acba0592-cb65-5de8-894d-4d12f14bb08c"
              >
                <p
                  className="leading-relaxed text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="d581eca5-2b03-552b-93a6-d229bb215a31"
                >
                  你好呀！我是考拉学长 🐨
                  很高兴遇见你。想申请PhD吗？先和我聊聊你的背景吧～
                </p>
              </div>
            </div>
          </div>
          <div
            className="flex justify-end"
            data-id="7a813015-f5e9-5072-aad3-0a4612fc5842"
          >
            <div
              className="max-w-[78%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl p-4"
              style={{ backgroundColor: "#c4a050" }}
              data-id="41a0885e-865c-57eb-b02b-b2b14a11fbdf"
            >
              <p
                className="leading-relaxed text-white text-sm leading-5"
                data-id="2a36f6ae-39b1-5418-94cc-588a1ef13c11"
              >
                学长好！我是计算机本科大三，GPA 3.8/4.0，想申请北美CS
                PhD，方向是机器学习。
              </p>
            </div>
          </div>
          <div
            className="flex items-end gap-2"
            data-id="f52198e8-bb00-50f2-b1ac-84828110b3ad"
          >
            <div
              className="size-9 shrink-0 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#c4a050" }}
              data-id="a0be50b4-543b-5bae-99c9-a50c58528b53"
            >
              <PawPrint
                className="size-5 text-white"
                data-id="05601876-4dd2-5858-8dd6-8f7958805c32"
              />
            </div>
            <div
              className="max-w-[78%] flex flex-col gap-1"
              data-id="7ae98aa6-f5b5-560e-ba45-a5ce6c691a20"
            >
              <div
                className="shadow-sm rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-white p-4"
                style={{ boxShadow: "0 2px 8px rgba(196,160,80,0.12)" }}
                data-id="bdbfd505-1680-5658-a800-736b1b7f0cc5"
              >
                <p
                  className="leading-relaxed text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="07f66d78-af11-5041-bc32-0586783de10c"
                >
                  背景不错！GPA很有竞争力。我需要再了解几点：
                </p>
                <div
                  className="flex mt-2 flex-col gap-1"
                  data-id="9ce10e4c-6401-55df-8a1e-54c83ded135e"
                >
                  <span
                    className="text-sm leading-5"
                    style={{ color: "#1a2332" }}
                    data-id="0958c09e-26fd-519b-b549-03dda822f789"
                  >
                    ① 是否有顶会论文（NeurIPS/ICML等）？
                  </span>
                  <span
                    className="text-sm leading-5"
                    style={{ color: "#1a2332" }}
                    data-id="94dd3632-98e5-50c6-8aa8-b0c2a8d6a663"
                  >
                    ② 科研经历多久了？
                  </span>
                  <span
                    className="text-sm leading-5"
                    style={{ color: "#1a2332" }}
                    data-id="43c9516c-4c1f-503a-959b-06e7001ba518"
                  >
                    ③ 托福/GRE分数？
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="flex justify-center"
            data-id="8677a6d2-f794-58c4-b725-7a7c0bb91740"
          >
            <span
              className="text-[10px] px-2"
              style={{ color: "#a89f8d" }}
              data-id="85ba3fd7-0e01-5108-8329-a8f017a82a5e"
            >
              14:35
            </span>
          </div>
          <div
            className="flex justify-end"
            data-id="173a3b4b-3fbd-5060-8277-1a633bf05bbc"
          >
            <div
              className="max-w-[78%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl p-4"
              style={{ backgroundColor: "#c4a050" }}
              data-id="16544f05-63ce-5fec-889b-f37257db4fd8"
            >
              <p
                className="leading-relaxed text-white text-sm leading-5"
                data-id="81f9e427-bf21-558b-98fa-78de018b236d"
              >
                有一篇ICML workshop二作，科研一年半，托福108，GRE还没考。
              </p>
            </div>
          </div>
          <div
            className="flex items-end gap-2"
            data-id="cd08906d-4f7c-5bdd-a479-57b974360eeb"
          >
            <div
              className="size-9 shrink-0 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#c4a050" }}
              data-id="8ea12481-7c62-5ba1-9d46-36ecfeb4a3b9"
            >
              <PawPrint
                className="size-5 text-white"
                data-id="516f4c75-42f6-55e4-95a8-7f48817f53ef"
              />
            </div>
            <div
              className="max-w-[78%] flex flex-col gap-1"
              data-id="88ea4f73-dfaa-5ed3-87f2-581425e9ea21"
            >
              <div
                className="shadow-sm rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-white p-4"
                style={{ boxShadow: "0 2px 8px rgba(196,160,80,0.12)" }}
                data-id="6d1b1076-5263-5ec9-a40e-6e590510dd36"
              >
                <p
                  className="leading-relaxed text-sm leading-5"
                  style={{ color: "#1a2332" }}
                  data-id="b80d15c2-b3f7-5a1f-8233-4ac00a7283ec"
                >
                  整体定位是
                  <span
                    className="font-bold"
                    style={{ color: "#c4a050" }}
                    data-id="802399ab-340c-51b0-a6d5-19b6cd58a526"
                  >
                    Top 20–40
                  </span>
                  区间，冲刺Top 10可行 ✨
                  建议优先把ICML工作冲一作，并锁定2–3位推荐人。要不要我帮你生成一份选校清单？
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className="sticky bg-white border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid bottom-0"
          style={{ borderColor: "#e8dfc8" }}
          data-id="d1245978-523a-55a2-a5e6-5f328a192a4c"
        >
          <div
            className="flex p-4 items-center gap-2"
            data-id="230a6e42-4c94-5bf7-a4df-a49745267ed6"
          >
            <button
              className="size-9 shrink-0 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#f0e9d6" }}
              data-id="64682b9a-c40f-5c38-bf82-fdc33ecebc53"
            >
              <Plus
                className="size-5"
                style={{ color: "#1a2332" }}
                data-id="ceee8bab-c774-5963-a827-f297ed637a48"
              />
            </button>
            <div
              className="rounded-full px-4 py-2.5 flex-1"
              style={{ backgroundColor: "#f7f1e0" }}
              data-id="4a8448e9-52d9-5cd2-8de9-00a524174b8e"
            >
              <span
                className="text-sm leading-5"
                style={{ color: "#a89f8d" }}
                data-id="2f140702-8af8-53af-976a-eb3e2273493e"
              >
                和考拉学长说说你的情况…
              </span>
            </div>
            <button
              className="size-9 shrink-0 rounded-full flex justify-center items-center"
              style={{ backgroundColor: "#c4a050" }}
              data-id="ac9d283a-5a9b-5554-b85c-13554a98fc48"
            >
              <Send
                className="size-4 fill-white text-white"
                data-id="85414f35-3fb5-5659-8f08-e8844caf2cb8"
              />
            </button>
          </div>
          <div
            className="border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex p-2 justify-around items-center"
            style={{ borderColor: "#f0e9d6" }}
            data-id="c19da1e0-7a64-5e1c-ad47-7288f9e09251"
          >
            <div
              className="flex px-3 py-1 flex-col items-center gap-1"
              data-id="9573b4b1-0708-5258-be70-91ee5c3d2667"
            >
              <MessageCircle
                className="size-5"
                style={{ color: "#8a8270" }}
                data-id="9771a082-2919-562e-9ebe-31f2f97a601a"
              />
              <span
                className="text-[10px]"
                style={{ color: "#8a8270" }}
                data-id="4ae09cbe-4582-5502-8f25-000cacf04d0a"
              >
                Koala
              </span>
            </div>
            <div
              className="rounded-2xl flex px-3 py-1.5 flex-col items-center gap-1"
              style={{ backgroundColor: "#c4a050" }}
              data-id="d38ab33f-ae02-58b7-83e8-41e04ab6abf4"
            >
              <Home
                className="size-5 text-white"
                data-id="7527439e-2303-5445-aa36-0260c07e9a7e"
              />
              <span
                className="font-medium text-white text-[10px]"
                data-id="fd4868c5-32cd-510f-84bc-0cca5ac0f6d0"
              >
                首页
              </span>
            </div>
            <div
              className="flex px-3 py-1 flex-col items-center gap-1"
              data-id="508eabb7-b47d-519b-b472-a807b273dc79"
            >
              <Users
                className="size-5"
                style={{ color: "#8a8270" }}
                data-id="e6a8715a-60a5-57a3-9faf-a2b1b6974354"
              />
              <span
                className="text-[10px]"
                style={{ color: "#8a8270" }}
                data-id="6e291619-a2df-55bc-a1fb-2242128442b0"
              >
                教授
              </span>
            </div>
            <div
              className="flex px-3 py-1 flex-col items-center gap-1"
              data-id="6a2c7361-3ee9-5c75-855c-01d607d7a1cf"
            >
              <BookOpen
                className="size-5"
                style={{ color: "#8a8270" }}
                data-id="96f88eed-96ec-52ae-9471-2b0d103915a1"
              />
              <span
                className="text-[10px]"
                style={{ color: "#8a8270" }}
                data-id="8d6ea90d-5fbc-55f6-9bfe-dd60cd41d7b3"
              >
                博客
              </span>
            </div>
            <div
              className="flex px-3 py-1 flex-col items-center gap-1"
              data-id="af18b827-b877-53f7-99a8-698e37199bd1"
            >
              <Wrench
                className="size-5"
                style={{ color: "#8a8270" }}
                data-id="552ad34a-7db4-5c72-a42d-fd00e517aacc"
              />
              <span
                className="text-[10px]"
                style={{ color: "#8a8270" }}
                data-id="c58eb25b-f6ef-5753-a78c-be714352b8ba"
              >
                工具
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
