import { useEffect } from "react";
import {
  BatteryFull,
  BookOpen,
  Bookmark,
  ChevronLeft,
  Home,
  MessageCircle,
  Search,
  Signal,
  SlidersHorizontal,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";

export default function App() {
  return (
    <div>
      <div
        className="bg-neutral-950 text-neutral-950 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible"
        style={{ backgroundColor: "#faf6ec" }}
        data-id="1eab74bd-2517-51b6-ac71-ef8223412240"
      >
        <div
          className="flex px-6 pt-3 pb-1 justify-between items-center"
          style={{ color: "#1a2332" }}
          data-id="40150d96-442b-5593-91f5-661ba9f48b39"
        >
          <span
            className="font-semibold text-sm leading-5"
            data-id="f828a6af-6930-5426-8ae0-7f88e83aa47d"
          >
            9:41
          </span>
          <div
            className="flex items-center gap-1"
            data-id="64474f5b-3447-57d1-a445-85ce8299fc08"
          >
            <Signal
              className="size-4"
              data-id="721e6281-c873-5e80-b91b-fb44b1a8d64b"
            />
            <Wifi
              className="size-4"
              data-id="cca50778-c9aa-5e29-b471-1b0ba7f6609f"
            />
            <BatteryFull
              className="size-5"
              data-id="61439ad9-a677-5a69-912e-95651c55e1df"
            />
          </div>
        </div>
        <div
          className="flex px-4 pt-3 pb-2 justify-between items-center"
          data-id="f19a2759-5f92-507f-92c9-df99a8d1c9a1"
        >
          <button
            className="size-10 rounded-full flex justify-center items-center"
            style={{ backgroundColor: "#f0e9d6" }}
            data-id="63882694-b594-5598-b4d0-7c37b56b85bf"
          >
            <ChevronLeft
              className="size-5"
              style={{ color: "#1a2332" }}
              data-id="87b4e1aa-305c-578b-84d2-033f529105ad"
            />
          </button>
          <h1
            className="font-bold text-lg leading-7"
            style={{ color: "#1a2332" }}
            data-id="3c5777e3-15c6-5126-b264-9b038faeffd4"
          >
            教授库
          </h1>
          <button
            className="size-10 rounded-full flex justify-center items-center"
            style={{ backgroundColor: "#f0e9d6" }}
            data-id="f9f56da2-cb10-5898-be6c-46c969b6b825"
          >
            <SlidersHorizontal
              className="size-5"
              style={{ color: "#c4a050" }}
              data-id="739b6a1a-ba4d-54bf-9793-631d822fbde6"
            />
          </button>
        </div>
        <div
          className="px-4 pt-2"
          data-id="8308936f-ab9d-57ae-9056-3d95d2790f5c"
        >
          <div
            className="rounded-2xl flex px-4 py-3 items-center gap-2"
            style={{ backgroundColor: "#f0e9d6" }}
            data-id="cdf391cd-080f-5310-8068-b58b2c795cda"
          >
            <Search
              className="size-4"
              style={{ color: "#8a8470" }}
              data-id="c15b1d26-1295-5870-9ac1-9dbe8fd15a5b"
            />
            <span
              className="text-sm leading-5"
              style={{ color: "#a8a08a" }}
              data-id="b9352f25-e68b-5f1d-90a8-8a310b7d50af"
            >
              搜索教授姓名、学校、研究方向…
            </span>
          </div>
        </div>
        <div
          className="overflow-x-auto flex px-4 pt-4 gap-2"
          data-id="13c2000b-537f-5362-a07d-aaada1838919"
        >
          <span
            className="whitespace-nowrap font-bold rounded-full text-white text-xs leading-4 px-4 py-2"
            style={{ backgroundColor: "#c4a050" }}
            data-id="cef67712-1988-509d-a4ae-6daf0559b8bb"
          >
            全部
          </span>
          <span
            className="whitespace-nowrap rounded-full bg-white text-xs leading-4 border-black/1 border-1 border-solid px-4 py-2"
            style={{ borderColor: "#e5dcc3", color: "#1a2332" }}
            data-id="40d867aa-3bba-5ec1-8b1e-7561045e17ac"
          >
            CS/AI
          </span>
          <span
            className="whitespace-nowrap rounded-full bg-white text-xs leading-4 border-black/1 border-1 border-solid px-4 py-2"
            style={{ borderColor: "#e5dcc3", color: "#1a2332" }}
            data-id="dcf1aff6-cb0b-5852-8485-f302e0ae3ccd"
          >
            生物医学
          </span>
          <span
            className="whitespace-nowrap rounded-full bg-white text-xs leading-4 border-black/1 border-1 border-solid px-4 py-2"
            style={{ borderColor: "#e5dcc3", color: "#1a2332" }}
            data-id="a4f16170-353d-54a6-81a4-b97dc6d97ecc"
          >
            商科
          </span>
          <span
            className="whitespace-nowrap rounded-full bg-white text-xs leading-4 border-black/1 border-1 border-solid px-4 py-2"
            style={{ borderColor: "#e5dcc3", color: "#1a2332" }}
            data-id="4ade8f9a-918a-5a85-84f9-f1e7739ddf82"
          >
            工程
          </span>
          <span
            className="whitespace-nowrap rounded-full bg-white text-xs leading-4 border-black/1 border-1 border-solid px-4 py-2"
            style={{ borderColor: "#e5dcc3", color: "#1a2332" }}
            data-id="0257b313-fb75-5233-8e40-29977cac1ac2"
          >
            社科
          </span>
        </div>
        <div
          className="flex px-4 pt-4 pb-32 flex-col gap-4"
          data-id="f943e1c9-1de6-5ccf-beed-6c48aca9bd70"
        >
          <div
            className="rounded-2xl bg-white flex p-4 gap-3"
            style={{ boxShadow: "0 4px 16px rgba(196, 160, 80, 0.12)" }}
            data-id="9112a095-592b-524f-834b-d55be25659cb"
          >
            <div
              className="size-16 shrink-0 rounded-full overflow-hidden"
              data-id="3f8db77c-793b-5ded-91f0-e3f78cf90b63"
            >
              <img
                alt="Professor"
                className="object-cover w-full h-full"
                data-authorname="Foto Sushi"
                data-authorurl="https://unsplash.com/@fotosushi"
                data-blurhash="L9A0v#00~q00ITxu%MM{00Rj%MWB"
                data-photoid="7bwQXzbF6KE"
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3OTAzMTh8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3J8ZW58MXx8fHwxNzU0OTIzNzc3fDA&ixlib=rb-4.1.0&q=80&w=200"
                data-id="a3e1bf52-06f7-51a9-82ed-08bdc4deae20"
              />
            </div>
            <div
              className="min-w-0 flex flex-col flex-1 gap-1"
              data-id="79862ffd-c46e-5f3c-af32-f1f0ed46c9b1"
            >
              <div
                className="flex justify-between items-start gap-2"
                data-id="0466d53f-1ec0-595f-86df-ea0483ae2fdc"
              >
                <div
                  className="min-w-0"
                  data-id="67601b8d-5cc3-5e99-a298-7104c7caeab6"
                >
                  <h3
                    className="truncate font-bold text-base leading-6"
                    style={{ color: "#1a2332" }}
                    data-id="f4c0891c-e5b2-522f-91c5-f7bab361bc17"
                  >
                    Dr. Andrew Chen
                  </h3>
                  <p
                    className="text-xs leading-4"
                    style={{ color: "#7a7468" }}
                    data-id="8a6ae541-1838-5fca-a62d-b5dcbf5bd847"
                  >
                    Stanford University
                  </p>
                </div>
                <Bookmark
                  className="size-5 shrink-0"
                  style={{ color: "#c4a050", fill: "#c4a050" }}
                  data-id="3850fb59-3aa6-5588-92c6-e79fae63d2bc"
                />
              </div>
              <div
                className="flex mt-1 flex-wrap gap-1"
                data-id="f8cbe941-a2d0-500f-aeae-1af232e70a1c"
              >
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="92d6325c-c21f-5e3b-afef-37bd9c809cbd"
                >
                  CS
                </span>
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="4c7c57c8-c50c-5aef-87dc-d6ff1daf45c8"
                >
                  Machine Learning
                </span>
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="04d6c2fc-f4b2-5448-9142-24f3710452d6"
                >
                  NLP
                </span>
              </div>
              <div
                className="flex mt-1 justify-end"
                data-id="bcd79621-59ff-5a44-86bb-741b1175cc62"
              >
                <span
                  className="font-medium text-xs leading-4"
                  style={{ color: "#c4a050" }}
                  data-id="1bad5684-4571-5ce6-b4ba-f6ebf52c6a05"
                >
                  查看详情 ›
                </span>
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl bg-white flex p-4 gap-3"
            style={{ boxShadow: "0 4px 16px rgba(196, 160, 80, 0.12)" }}
            data-id="51180f24-0058-5916-a5d4-fee89127ec58"
          >
            <div
              className="size-16 shrink-0 rounded-full overflow-hidden"
              data-id="0f94acc2-005b-5214-8f7c-da3f9e9038b6"
            >
              <img
                alt="Professor"
                className="object-cover w-full h-full"
                data-authorname="Christina"
                data-authorurl="https://unsplash.com/@wocintechchat"
                data-blurhash="LFGuHl00xu9Z009Ft7ay00%M%Mxu"
                data-photoid="iEEBWgY_6lA"
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3OTAzMTh8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjB3b21hbnxlbnwxfHx8fDE3NTQ5MjM3Nzd8MA&ixlib=rb-4.1.0&q=80&w=200"
                data-id="cdd434ec-891b-57b2-826f-73e0c9b25f08"
              />
            </div>
            <div
              className="min-w-0 flex flex-col flex-1 gap-1"
              data-id="a4563b02-a688-5abc-84f0-813384aa85ad"
            >
              <div
                className="flex justify-between items-start gap-2"
                data-id="d8f1f645-ec42-5e22-9ce6-0edfcafaaf35"
              >
                <div
                  className="min-w-0"
                  data-id="e3bd3fc0-9921-5255-b37d-27275ae691d8"
                >
                  <h3
                    className="truncate font-bold text-base leading-6"
                    style={{ color: "#1a2332" }}
                    data-id="d29bccc6-42fd-5ad4-8528-99b1b71108e5"
                  >
                    Dr. Sarah Mitchell
                  </h3>
                  <p
                    className="text-xs leading-4"
                    style={{ color: "#7a7468" }}
                    data-id="5647785c-bb56-5211-8fba-a2d6a41a09e2"
                  >
                    MIT
                  </p>
                </div>
                <Bookmark
                  className="size-5 shrink-0"
                  style={{ color: "#c4a050" }}
                  data-id="12d26364-cd17-5dd3-9bd0-38a46db0b5a8"
                />
              </div>
              <div
                className="flex mt-1 flex-wrap gap-1"
                data-id="7cf24f7f-3650-53d4-ab24-e5b18c2b7873"
              >
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="e0fedeaa-b085-5e6a-b77a-9c8f6a05a6b8"
                >
                  生物医学
                </span>
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="7ffc71a2-6de0-5925-a3ef-0e6516145e1b"
                >
                  Genomics
                </span>
              </div>
              <div
                className="flex mt-1 justify-end"
                data-id="c4ab17c8-f745-5213-b70d-19e5ff53e907"
              >
                <span
                  className="font-medium text-xs leading-4"
                  style={{ color: "#c4a050" }}
                  data-id="7820b9ef-9bfd-57ee-b68b-a2ea2e840468"
                >
                  查看详情 ›
                </span>
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl bg-white flex p-4 gap-3"
            style={{ boxShadow: "0 4px 16px rgba(196, 160, 80, 0.12)" }}
            data-id="ad113542-0185-5b8d-be3d-1339c57efc85"
          >
            <div
              className="size-16 shrink-0 rounded-full overflow-hidden"
              data-id="33595710-38e6-5cff-8425-6a911af875c3"
            >
              <img
                alt="Professor"
                className="object-cover w-full h-full"
                data-authorname="Ben Parker"
                data-authorurl="https://unsplash.com/@benparker"
                data-blurhash="LCF$kS00~q00ITxu-;%M00Rj%Mof"
                data-photoid="Y20JJ_ddy9M"
                src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3OTAzMTh8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjBtYW58ZW58MXx8fHwxNzU0OTIzNzc3fDA&ixlib=rb-4.1.0&q=80&w=200"
                data-id="ef977979-2b10-54dd-9bfa-89a52a6fde56"
              />
            </div>
            <div
              className="min-w-0 flex flex-col flex-1 gap-1"
              data-id="3ec63986-98f4-5cfd-9923-86ab5394f7b4"
            >
              <div
                className="flex justify-between items-start gap-2"
                data-id="b45684d2-1b36-5f5e-952d-9c988c288b45"
              >
                <div
                  className="min-w-0"
                  data-id="7f703817-5af6-56df-96ee-4c4c049f760b"
                >
                  <h3
                    className="truncate font-bold text-base leading-6"
                    style={{ color: "#1a2332" }}
                    data-id="7be1b763-1d60-5e93-a7e2-8ac686abfb99"
                  >
                    Dr. James Liu
                  </h3>
                  <p
                    className="text-xs leading-4"
                    style={{ color: "#7a7468" }}
                    data-id="ab2cc4c3-fa02-59bc-92e6-44ce256701f8"
                  >
                    UC Berkeley
                  </p>
                </div>
                <Bookmark
                  className="size-5 shrink-0"
                  style={{ color: "#c4a050", fill: "#c4a050" }}
                  data-id="776842b6-7f2e-517b-87bb-2474f5bf940c"
                />
              </div>
              <div
                className="flex mt-1 flex-wrap gap-1"
                data-id="bd0cdb5f-e467-5a20-88c3-a8ca3d4f2fa4"
              >
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="82bc1e29-13fd-55bc-9e54-992af308ab92"
                >
                  商科
                </span>
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="d0a5c929-86d2-5422-a31e-06973fb3a4be"
                >
                  Finance
                </span>
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="6c5c35a0-9d04-5f7a-ab87-bda207067571"
                >
                  Strategy
                </span>
              </div>
              <div
                className="flex mt-1 justify-end"
                data-id="c55e421b-1fce-50d1-a61f-e6fc8d52ef20"
              >
                <span
                  className="font-medium text-xs leading-4"
                  style={{ color: "#c4a050" }}
                  data-id="cc039545-2b01-5b94-afbf-9f20a4e0d1ee"
                >
                  查看详情 ›
                </span>
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl bg-white flex p-4 gap-3"
            style={{ boxShadow: "0 4px 16px rgba(196, 160, 80, 0.12)" }}
            data-id="9721ed11-42e6-5f8c-8c88-fd72ba25a173"
          >
            <div
              className="size-16 shrink-0 rounded-full overflow-hidden"
              data-id="3849e1c9-0c4d-5bfa-98d3-2f52b76d536e"
            >
              <img
                alt="Professor"
                className="object-cover w-full h-full"
                data-authorname="Andrew Neel"
                data-authorurl="https://unsplash.com/@andrewtneel"
                data-blurhash="L9D]i600~q00ITxu-;9F00Rj%Mof"
                data-photoid="BtbjCFUvBXs"
                src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3OTAzMTh8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjBhc2lhbnxlbnwxfHx8fDE3NTQ5MjM3Nzd8MA&ixlib=rb-4.1.0&q=80&w=200"
                data-id="3c3af7d3-0077-57cb-b385-24e49a721c3f"
              />
            </div>
            <div
              className="min-w-0 flex flex-col flex-1 gap-1"
              data-id="69c546a1-0ceb-552c-a217-424e717f0c56"
            >
              <div
                className="flex justify-between items-start gap-2"
                data-id="1243dcf0-b5f7-5dc5-b86d-95df110f34b5"
              >
                <div
                  className="min-w-0"
                  data-id="3f405731-9c95-5c33-ae59-692a02ff88c3"
                >
                  <h3
                    className="truncate font-bold text-base leading-6"
                    style={{ color: "#1a2332" }}
                    data-id="3aa4f299-7eff-5129-8833-5bd94e51a7ee"
                  >
                    Dr. Emily Wang
                  </h3>
                  <p
                    className="text-xs leading-4"
                    style={{ color: "#7a7468" }}
                    data-id="119d176e-5dec-5105-9975-212a163e11bc"
                  >
                    Carnegie Mellon
                  </p>
                </div>
                <Bookmark
                  className="size-5 shrink-0"
                  style={{ color: "#c4a050" }}
                  data-id="98872ff6-f274-5c0d-b719-e378584cd72b"
                />
              </div>
              <div
                className="flex mt-1 flex-wrap gap-1"
                data-id="da4c28bf-f846-5f22-91b0-256bbde7f056"
              >
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="6bc57528-87f8-5869-aca1-d906cdddd220"
                >
                  工程
                </span>
                <span
                  className="rounded-full text-[10px] border-black/1 border-1 border-solid px-2 py-0.5"
                  style={{ borderColor: "#c4a050", color: "#c4a050" }}
                  data-id="8f26f349-86b2-59d8-8faa-3273780265f2"
                >
                  Robotics
                </span>
              </div>
              <div
                className="flex mt-1 justify-end"
                data-id="0d116a12-0657-5694-882a-fc6fc5e9871f"
              >
                <span
                  className="font-medium text-xs leading-4"
                  style={{ color: "#c4a050" }}
                  data-id="970f13dc-18c6-5234-9720-f8305b731e8a"
                >
                  查看详情 ›
                </span>
              </div>
            </div>
          </div>
        </div>
        <div
          className="fixed bg-white border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex inset-x-0 bottom-0 px-2 pt-2 pb-6 justify-around items-end"
          style={{ borderColor: "#e5dcc3" }}
          data-id="947751f9-de8b-5a20-9eaa-995bafeeae07"
        >
          <button
            className="flex flex-col items-center flex-1 gap-1"
            data-id="b0911515-1aaa-5b7f-b4de-bfba49f2b583"
          >
            <div
              className="size-12 rounded-full flex -mt-6 justify-center items-center"
              style={{
                backgroundColor: "#c4a050",
                boxShadow: "0 4px 12px rgba(196, 160, 80, 0.4)",
              }}
              data-id="06c97931-9d58-5308-9c01-78c535b5f081"
            >
              <MessageCircle
                className="size-6 text-white"
                data-id="e7310f8c-286d-5e74-98ef-2c023142ffa5"
              />
            </div>
            <span
              className="font-medium text-[10px]"
              style={{ color: "#1a2332" }}
              data-id="39239339-b32f-5e40-8689-ae58c2d033b8"
            >
              Koala
            </span>
          </button>
          <button
            className="flex pt-1 flex-col items-center flex-1 gap-1"
            data-id="0cb1b58f-4cd3-5895-9a02-27b665d63299"
          >
            <Home
              className="size-5"
              style={{ color: "#7a7468" }}
              data-id="c60d568f-2c68-5c2e-8b95-12892ecfaaca"
            />
            <span
              className="text-[10px]"
              style={{ color: "#7a7468" }}
              data-id="d834a23f-576d-51a1-bc10-03e344d1cf44"
            >
              首页
            </span>
          </button>
          <button
            className="flex pt-1 flex-col items-center flex-1 gap-1"
            data-id="e96a9d33-3100-566a-b4f4-f6235e4fcd44"
          >
            <Users
              className="size-5"
              style={{ color: "#c4a050" }}
              data-id="8d3909cd-6026-534d-9dd3-764bba57858f"
            />
            <span
              className="font-bold text-[10px]"
              style={{ color: "#c4a050" }}
              data-id="a0b77dfb-0e42-5620-9b1f-2c79c2e95b9e"
            >
              教授
            </span>
          </button>
          <button
            className="flex pt-1 flex-col items-center flex-1 gap-1"
            data-id="44ad4db3-02b7-5db4-a834-df8d2b8f091a"
          >
            <BookOpen
              className="size-5"
              style={{ color: "#7a7468" }}
              data-id="b34d90cc-84a0-52c2-b3ec-6cfb3a7b7e6c"
            />
            <span
              className="text-[10px]"
              style={{ color: "#7a7468" }}
              data-id="cd9f5cc7-420d-560f-b8a4-c1753643c10f"
            >
              博客
            </span>
          </button>
          <button
            className="flex pt-1 flex-col items-center flex-1 gap-1"
            data-id="46166d0a-41d8-5378-91e1-fde430826388"
          >
            <Wrench
              className="size-5"
              style={{ color: "#7a7468" }}
              data-id="204dc688-b21e-53b4-a4ce-e2a91f5552a8"
            />
            <span
              className="text-[10px]"
              style={{ color: "#7a7468" }}
              data-id="b2a32c0f-b04f-5baf-962d-a77648a07c76"
            >
              工具
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
