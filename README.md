# Realtime Wage Calculator

实时工资计算器是一个给打工人使用的小工具：输入日薪和当天工作时间后，页面按秒实时显示今天已经赚到的工资。

## V1 Scope

- 输入日薪资。
- 输入上班时间、下班时间、午休开始时间、午休结束时间。
- 每秒刷新当前已获得工资。
- 午休时间不计薪。
- 上班前显示 0，下班后固定为当天日薪。
- 不支持加班。
- 暂不区分工作日和周末。
- 使用浏览器 localStorage 保存用户设置。

## Tech Stack

- Next.js
- React
- TypeScript
- Browser localStorage

Python/FastAPI 后端暂不进入 V1。后续如果需要账号、多设备同步、历史统计或数据分析，再加入后端服务。

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.
