import { useEffect } from "react";
import {
  BatteryFull,
  BookOpen,
  Calculator,
  CalendarDays,
  Clock,
  Home,
  Mail,
  MessageCircle,
  PenLine,
  Search,
  Signal,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function App() {
  return (
    <div>
      <div
        className="bg-white text-neutral-950 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible"
        style={{ backgroundColor: "#faf6ec" }}
        data-id="37d5da84-3386-5c3e-84ab-73f72d932036"
      >
        <div
          className="font-semibold text-xs leading-4 flex px-6 pt-3 pb-1 justify-between items-center"
          style={{ color: "#1a2332" }}
          data-id="1f548518-0981-5334-9c0b-2b90d5569054"
        >
          <span data-id="2f99c8c7-3509-5455-8f1b-e727bee7c3db">9:41</span>
          <div
            className="flex items-center gap-1"
            data-id="15f43277-7f16-5e92-9e76-d4dbc1166a4e"
          >
            <Signal
              className="size-3.5"
              data-id="313f7691-7fb7-5ce3-92f0-06e471092a47"
            />
            <Wifi
              className="size-3.5"
              data-id="6eb79bf3-8317-5617-a7f5-211d530955f9"
            />
            <BatteryFull
              className="size-4"
              data-id="8ae42911-b3dc-5f16-99e4-7b00de0defab"
            />
          </div>
        </div>
        <div
          className="flex px-6 pt-4 pb-2 justify-between items-center"
          data-id="bba8b5f3-b52b-5389-999d-d61d463cf5bc"
        >
          <div
            style={{ width: 32 }}
            data-id="66ed8600-1617-512c-bcc0-84ab9bde8776"
          />
          <h1
            className="font-bold text-xl leading-7"
            style={{ color: "#1a2332" }}
            data-id="dd447146-26e2-5fe0-8258-e332445b15bc"
          >{`博客 & 工具`}</h1>
          <button
            className="size-8 rounded-full flex justify-center items-center"
            style={{ backgroundColor: "rgba(196,160,80,0.12)" }}
            data-id="8f858351-a484-5708-a8b3-96d134712fd9"
          >
            <Search
              className="size-4"
              style={{ color: "#c4a050" }}
              data-id="ceb83cd8-0868-54ff-b7b5-36b9f67404b1"
            />
          </button>
        </div>
        <div
          className="px-6 pt-4"
          data-id="ec7a0eee-7e38-5959-86df-ddf9efa9c855"
        >
          <div
            className="rounded-full flex p-1 items-center"
            style={{ backgroundColor: "#f0e8d4" }}
            data-id="02c8a9be-4ea7-59fc-a0cf-3bbe35c282aa"
          >
            <button
              className="font-semibold rounded-full text-white text-sm leading-5 py-2 flex-1"
              style={{ backgroundColor: "#c4a050" }}
              data-id="506a62a5-c254-568b-8ee9-60ccd1efd84b"
            >
              博客
            </button>
            <button
              className="font-medium rounded-full text-sm leading-5 py-2 flex-1"
              style={{ color: "#1a2332" }}
              data-id="ce2c5bed-661a-5c40-a5c1-26f1dd61041d"
            >
              工具
            </button>
          </div>
        </div>
        <div
          className="px-6 pt-6"
          data-id="53eb3ec0-0978-5885-8dfa-a2d23369ef14"
        >
          <Card
            className="rounded-2xl border-black/1 border-0 border-solid p-0 gap-0 overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 16px rgba(196,160,80,0.12)",
            }}
            data-id="93ea22a0-bf10-5aeb-af97-48e4104c142d"
          >
            <div
              className="relative w-full h-40"
              style={{
                background:
                  "linear-gradient(135deg, #f5d89a 0%, #e8b878 50%, #c4a050 100%)",
              }}
              data-id="5e3383d9-b96e-5ef1-8fb8-85842c075269"
            >
              <img
                alt="Writing"
                className="object-cover opacity-70 w-full h-full"
                data-authorname="Aaron Burden"
                data-authorurl="https://unsplash.com/@aaronburden"
                data-blurhash="L9C6%[%MIU?b~qWBM{D%xufQR*j["
                data-photoid="4hbJ-eymZ1o"
                src="https://images.unsplash.com/photo-1455390582262-044cdead277a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
                data-id="42c0a7e3-21f8-5cc6-a18f-78108bbce476"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(26,35,50,0) 40%, rgba(26,35,50,0.55) 100%)",
                }}
                data-id="408bb22f-db8e-5a24-bb73-5fcbc84331b3"
              />
              <span
                className="font-semibold rounded-full text-white text-xs leading-4 absolute left-3 top-3 px-2.5 py-1"
                style={{ backgroundColor: "#c4a050" }}
                data-id="916a2ad8-aa16-55e5-9820-ade665f595be"
              >
                申请技巧
              </span>
              <span
                className="font-medium rounded-full text-xs leading-4 flex absolute right-3 top-3 px-2 py-1 items-center gap-1"
                style={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  color: "#1a2332",
                }}
                data-id="d0924bf6-12cc-53a6-9b06-3df738df7063"
              >
                <Clock
                  className="size-3"
                  data-id="a46d1894-2746-5161-838e-f3dc049760ee"
                />
                8 min
              </span>
            </div>
            <CardContent
              className="flex p-4 flex-col gap-2"
              data-id="4502a122-19ce-5a7c-a83d-813c0f673504"
            >
              <h2
                className="leading-snug font-bold text-base leading-6"
                style={{ color: "#1a2332" }}
                data-id="43d2de8f-4c9d-5631-b5c6-92b6b498b727"
              >
                如何写出打动教授的套磁信
              </h2>
              <p
                className="leading-relaxed text-xs leading-4"
                style={{ color: "#6b7280" }}
                data-id="e1cc4569-8918-5431-8192-e1c0b5a0bdd3"
              >
                从研究兴趣切入，三步法精准匹配教授方向，提升回复率。
              </p>
              <div
                className="flex pt-1 items-center gap-2"
                data-id="3c0bfacb-e9da-58cd-affe-ef7c5e0f90c6"
              >
                <div
                  className="size-6 font-bold rounded-full text-white text-[10px] flex justify-center items-center"
                  style={{ backgroundColor: "#c4a050" }}
                  data-id="c6efed22-43bd-5c15-b9d3-f6812ca56187"
                >
                  L
                </div>
                <span
                  className="text-xs leading-4"
                  style={{ color: "#6b7280" }}
                  data-id="66ee9ea3-bc3e-5f3c-bbed-15765fece919"
                >
                  李学姐 · 2 天前
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div
          className="flex px-6 pt-6 flex-col gap-3"
          data-id="4e771a76-65f5-5cfd-b58f-8894fa23339b"
        >
          <div
            className="rounded-xl flex items-stretch overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 8px rgba(196,160,80,0.08)",
            }}
            data-id="71d37067-d9b4-5038-a829-2b31b3b2d208"
          >
            <div
              style={{ backgroundColor: "#c4a050", width: 4 }}
              data-id="c3419a2d-ca78-525b-af0d-04ca1b0a6017"
            />
            <div
              className="flex p-3 flex-col flex-1 gap-1"
              data-id="92372fb2-3a5d-503f-a90a-040f2905b7b5"
            >
              <h3
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="25c2d26b-121a-5147-bfe7-ec84ac553c39"
              >
                美研选校：冲稳保的黄金比例
              </h3>
              <p
                className="text-xs leading-4"
                style={{ color: "#6b7280" }}
                data-id="2e83b24f-a290-591b-b71d-d95f1c7a90de"
              >
                用数据告诉你如何科学搭配选校名单。
              </p>
              <span
                className="text-[11px] mt-1"
                style={{ color: "#a89878" }}
                data-id="b6cc0932-46ad-551f-aee8-bb4f5550a2ae"
              >
                10月12日 · 文书
              </span>
            </div>
          </div>
          <div
            className="rounded-xl flex items-stretch overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 8px rgba(196,160,80,0.08)",
            }}
            data-id="b0055b91-6b6d-50e1-902c-8d9beb72e570"
          >
            <div
              style={{ backgroundColor: "#c4a050", width: 4 }}
              data-id="34ec6907-17dc-59a6-ac22-40ba9480d9a8"
            />
            <div
              className="flex p-3 flex-col flex-1 gap-1"
              data-id="85c2f5a7-eaca-5e6f-b506-8a6e75309c7e"
            >
              <h3
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="02150584-7885-5e14-af47-3abaaeb97564"
              >
                面试常见问题 Top 20 解析
              </h3>
              <p
                className="text-xs leading-4"
                style={{ color: "#6b7280" }}
                data-id="027dae9d-b07a-5b05-909a-5970dd99b386"
              >
                覆盖 PhD 面试核心套路与应对话术。
              </p>
              <span
                className="text-[11px] mt-1"
                style={{ color: "#a89878" }}
                data-id="68f04ac7-ba57-587e-9e00-3b72d9a14971"
              >
                10月08日 · 面试
              </span>
            </div>
          </div>
          <div
            className="rounded-xl flex items-stretch overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 8px rgba(196,160,80,0.08)",
            }}
            data-id="70557edb-d916-53e7-87ce-43f03fb07942"
          >
            <div
              style={{ backgroundColor: "#c4a050", width: 4 }}
              data-id="53d09b9e-5e8b-5b15-9a0f-dc12d5943af3"
            />
            <div
              className="flex p-3 flex-col flex-1 gap-1"
              data-id="6e894e40-acac-59fd-89bd-174789733100"
            >
              <h3
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="8e171ab8-7f4b-5a1e-9e22-a95a7e6a289d"
              >
                奖学金申请的隐藏机会
              </h3>
              <p
                className="text-xs leading-4"
                style={{ color: "#6b7280" }}
                data-id="866d4f69-57b9-5bd9-b44f-30e000389c55"
              >
                盘点容易被忽视的资助渠道与时间节点。
              </p>
              <span
                className="text-[11px] mt-1"
                style={{ color: "#a89878" }}
                data-id="a15793fc-1fb7-516d-89b9-9b631c92cd6c"
              >
                10月03日 · 奖学金
              </span>
            </div>
          </div>
        </div>
        <div
          className="px-6 pt-8"
          data-id="535dad2b-5820-5bfa-a736-6088f10e26e1"
        >
          <div
            className="flex mb-4 justify-between items-center"
            data-id="eca0a344-8807-5236-809e-53c967253413"
          >
            <h2
              className="font-bold text-lg leading-7"
              style={{ color: "#1a2332" }}
              data-id="c4a012aa-7f5b-5a35-896d-dc4f4559010d"
            >
              工具箱
            </h2>
            <span
              className="font-medium text-xs leading-4"
              style={{ color: "#c4a050" }}
              data-id="818807e4-a32c-5f13-af17-4e059e637171"
            >
              查看全部
            </span>
          </div>
          <div
            className="grid grid-cols-2 gap-3"
            data-id="4e2d6067-0552-57ed-a8ae-aafdd385bd62"
          >
            <div
              className="rounded-2xl flex p-4 flex-col gap-2"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 10px rgba(196,160,80,0.10)",
              }}
              data-id="f4f1f5eb-3f5c-5188-99fd-5886266f11ab"
            >
              <div
                className="size-10 rounded-xl flex justify-center items-center"
                style={{ backgroundColor: "rgba(196,160,80,0.12)" }}
                data-id="cf0272f5-c0e2-5946-b9ee-09811558bd60"
              >
                <Mail
                  className="size-5"
                  style={{ color: "#c4a050" }}
                  data-id="107a2159-1bf5-5cd9-948c-f8a7b16c83e6"
                />
              </div>
              <span
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="6cc11ef3-d9be-52e7-bfb1-2d1eee644958"
              >
                套磁信生成器
              </span>
              <span
                className="text-[11px]"
                style={{ color: "#6b7280" }}
                data-id="308fe08e-4ba4-5252-a056-be6a85d09dd5"
              >
                AI 一键生成
              </span>
            </div>
            <div
              className="rounded-2xl flex p-4 flex-col gap-2"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 10px rgba(196,160,80,0.10)",
              }}
              data-id="4570e2df-512d-5b46-8917-9f821a626a08"
            >
              <div
                className="size-10 rounded-xl flex justify-center items-center"
                style={{ backgroundColor: "rgba(196,160,80,0.12)" }}
                data-id="1c02dbb0-f960-52a3-8266-a99609490d34"
              >
                <PenLine
                  className="size-5"
                  style={{ color: "#c4a050" }}
                  data-id="551eba0e-a220-5c45-98ef-fadd56c8dd58"
                />
              </div>
              <span
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="e933882c-13a3-5936-af7b-9bcd693d31ad"
              >
                SOP 润色
              </span>
              <span
                className="text-[11px]"
                style={{ color: "#6b7280" }}
                data-id="00e0ccaa-cfa1-56f9-86ab-f5eda75fc245"
              >
                专业表达优化
              </span>
            </div>
            <div
              className="rounded-2xl flex p-4 flex-col gap-2"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 10px rgba(196,160,80,0.10)",
              }}
              data-id="13c14a19-9aa7-5d96-a453-ddd07323f66e"
            >
              <div
                className="size-10 rounded-xl flex justify-center items-center"
                style={{ backgroundColor: "rgba(196,160,80,0.12)" }}
                data-id="cd309aa7-980e-5d55-a46c-82323e90175b"
              >
                <Calculator
                  className="size-5"
                  style={{ color: "#c4a050" }}
                  data-id="5ce1a40a-a1c7-5177-9480-3e5398318b43"
                />
              </div>
              <span
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="1ed0011a-3f78-52af-bd4d-fcfb2df2717d"
              >
                GPA 换算
              </span>
              <span
                className="text-[11px]"
                style={{ color: "#6b7280" }}
                data-id="8982fbac-b86d-55f4-b886-5789dccc659c"
              >
                多体系互转
              </span>
            </div>
            <div
              className="rounded-2xl flex p-4 flex-col gap-2"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 10px rgba(196,160,80,0.10)",
              }}
              data-id="4179934a-15c6-5b20-91f8-c368621acbf1"
            >
              <div
                className="size-10 rounded-xl flex justify-center items-center"
                style={{ backgroundColor: "rgba(196,160,80,0.12)" }}
                data-id="ba788fc5-998d-5920-91fb-fa412b92b63c"
              >
                <CalendarDays
                  className="size-5"
                  style={{ color: "#c4a050" }}
                  data-id="8ecf3c5c-9da9-5def-8c04-6b6ee66bb25e"
                />
              </div>
              <span
                className="font-bold text-sm leading-5"
                style={{ color: "#1a2332" }}
                data-id="591fdd7b-91dc-5cf7-90af-41c3fe65c888"
              >
                截止日期追踪
              </span>
              <span
                className="text-[11px]"
                style={{ color: "#6b7280" }}
                data-id="60e8ea87-b8a8-5eb5-941a-b2169fccb8ab"
              >
                不错过任何 DDL
              </span>
            </div>
          </div>
        </div>
        <div className="h-28" data-id="a2a6d6e3-f404-5b1b-b669-554962ca03a6" />
        <div
          className="fixed inset-x-0 bottom-0 mx-auto"
          style={{ maxWidth: 402 }}
          data-id="27cc5f66-faf7-5606-9ab2-37e1c11db18e"
        >
          <div
            className="relative px-4 py-6"
            style={{
              backgroundColor: "#ffffff",
              borderTop: "1px solid #f0e8d4",
              boxShadow: "0 -4px 16px rgba(196,160,80,0.08)",
            }}
            data-id="7f978205-3008-5752-9d60-4a7e2296dc53"
          >
            <div
              className="flex justify-around items-end"
              data-id="94ed20b7-a366-523c-a37d-f83436daca95"
            >
              <button
                className="flex flex-col items-center flex-1 gap-1"
                data-id="f94d26e8-f132-5dfb-bcd5-c3f6bd3b605c"
              >
                <Home
                  className="size-5"
                  style={{ color: "#a89878" }}
                  data-id="4c2dd84e-cb1f-5c36-a755-5a820f081e62"
                />
                <span
                  className="text-[11px]"
                  style={{ color: "#a89878" }}
                  data-id="255cc4ca-4cc9-5b8e-aef8-7f2aa10ed115"
                >
                  首页
                </span>
              </button>
              <button
                className="flex flex-col items-center flex-1 gap-1"
                data-id="3aea3870-e370-59f9-a753-650120e751fe"
              >
                <Users
                  className="size-5"
                  style={{ color: "#a89878" }}
                  data-id="81eef6cd-7ae0-5665-b3e5-df2e2ac78565"
                />
                <span
                  className="text-[11px]"
                  style={{ color: "#a89878" }}
                  data-id="93e46572-9c1e-5021-afb2-c233f00510a3"
                >
                  教授
                </span>
              </button>
              <div
                className="flex justify-center flex-1"
                data-id="cb1fc1b7-b084-57df-abc7-f9d3549ae4c7"
              >
                <button
                  className="size-14 rounded-full flex absolute -top-5 flex-col justify-center items-center"
                  style={{
                    backgroundColor: "#c4a050",
                    boxShadow: "0 6px 16px rgba(196,160,80,0.45)",
                  }}
                  data-id="958d0c2d-aac5-54eb-8d83-49a5def8bf2d"
                >
                  <MessageCircle
                    className="size-6 text-white"
                    data-id="d3ecd501-428d-559b-b34c-88d8d1bd52b7"
                  />
                  <span
                    className="font-semibold text-white text-[10px]"
                    data-id="d2325830-a15a-5961-9796-47775ca4daa7"
                  >
                    Koala
                  </span>
                </button>
              </div>
              <button
                className="flex flex-col items-center flex-1 gap-1"
                data-id="64a08a2b-ecaf-5682-9921-1b81bb739f8b"
              >
                <BookOpen
                  className="size-5"
                  style={{ color: "#c4a050" }}
                  data-id="23b01b0f-a90f-5fb3-8546-274d893aafa4"
                />
                <span
                  className="font-semibold text-[11px]"
                  style={{ color: "#c4a050" }}
                  data-id="5950bd23-3e07-583c-9ab1-db3bc027e781"
                >
                  博客
                </span>
              </button>
              <button
                className="flex flex-col items-center flex-1 gap-1"
                data-id="3b63d145-6d8d-52aa-85d2-38ae7f2d41b0"
              >
                <Wrench
                  className="size-5"
                  style={{ color: "#a89878" }}
                  data-id="82acfe5d-1a53-51b9-9882-e824cbd843ab"
                />
                <span
                  className="text-[11px]"
                  style={{ color: "#a89878" }}
                  data-id="5a39ed93-1200-5761-b567-841e7bc82dd8"
                >
                  工具
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
