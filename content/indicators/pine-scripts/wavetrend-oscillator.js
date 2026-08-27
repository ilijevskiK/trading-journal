// Source: published open-source by LazyBear on TradingView. Reproduced here
// for reference/education alongside the write-up in this app; not modified.
export const pineScript = `//
// @author LazyBear
//
// If you use this code in its original/modified form, do drop me a note.
//
study(title="WaveTrend [LazyBear]", shorttitle="WT_LB")
n1 = input(10, "Channel Length")
n2 = input(21, "Average Length")
obLevel1 = input(60, "Over Bought Level 1")
obLevel2 = input(53, "Over Bought Level 2")
osLevel1 = input(-60, "Over Sold Level 1")
osLevel2 = input(-53, "Over Sold Level 2")

ap = hlc3
esa = ta.ema(ap, n1)
d = ta.ema(math.abs(ap - esa), n1)
ci = (ap - esa) / (0.015 * d)
tci = ta.ema(ci, n2)

wt1 = tci
wt2 = ta.sma(wt1,4)

plot(0, color=color.gray)
plot(obLevel1, color=color.red)
plot(osLevel1, color=color.green)
plot(obLevel2, color=color.red, style=3)
plot(osLevel2, color=color.green, style=3)

plot(wt1, color=color.green)
plot(wt2, color=color.red, style=3)
plot(wt1-wt2, color=color.blue, transp=80)
`;

export const license = {
  author: "LazyBear",
  name: "Published open-source by the author on TradingView",
  url: null,
};
