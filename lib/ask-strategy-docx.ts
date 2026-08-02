import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  Footer,
  AlignmentType,
  VerticalAlign,
  LevelFormat,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
} from "docx";
import type { AskStrategy, CaseAlignmentPoint } from "./ask-strategy";

// Header/top-of-page Catapult Fundraising logo (dark-on-light lockup), matching
// the one used at the top of the live site — distinct from the light/white
// wordmark variant used inside the navy PDF header band. Embedded directly
// (pre-cropped to remove the transparent padding around the mark, and
// downscaled) so there's no network fetch and no wasted whitespace around
// the logo when it renders.
const LOGO_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAfQAAAB7CAMAAAC1mYIBAAADAFBMVEXjy53p17Tm1rLu5M///9oAAAAIGizCiTD+/v4SIzZ/f3/9/f0rNkfLkjW+hy8wOUhVVVU3QlE6R1TW1toiKzwADBtQWGY5Q1KqqlWnqrFOV2Vkanaqqarw5c91eoVcYm+wtLlyeoTn6OtDS1mGipRCTFnGx8zKl0QFERzT1df//39/AACEiZP5+fkADiKGiZL//wDKmEfo6Op7g42Ok5sbK0CDiZPIyM10eYSOk5uXmqSqVQBrcnx7gYsiLkBGUV1/f/+Mk5xkanaYm6O4u8H/f38uOUilqK/PpFl////SqmWnqK+ytLmwtLlbY2/Lm01SWWZZYm+Qk5zo1rLPo1fZtXfWs3Q+Pj5OVmWWm6O4vcIAAH8Af3+5u8MAVVUA//9VVap8g469wsYAAFUZKDdIUV1rcXzFx8zixJTs6ew5RlRBS1mcoqqjpKvHkjzPolX/qlW7wcbbvIUAAP9ES1l/fwBtcn3p3MhjaXXLm0/a3OH/fwD4+PkAAD8jLDxiaHR0e4ecoqrUqmjUrGnYtHTYs3Pq2LNbY28qMj5Vqqp8g47bu4Xv5tFKUV1WXGmVmqTSo1Lb2+M9PXpmZmaPlJz/AADq3cgqMj2Wm6TexI/X2Nvn1LDi3ORia3VqcX2dpKmcoKe/fz+qqgDOolrOqmzcvIfewo7b4ubjzKMQHS4bJzcAOzssMz5vc316fYZ1e4ihpayytbu9w8vDjjfdw5XcwpHeyKXd3eHd4uXjyJfn1bA/PwAvOEgzZmZISEhPU11bYm1aY3BdY3JiaHRwc3t8h4yFiJGKkpyUmaKqVVW/v7+ytLq3t8Oq///Khh7Tq2XWsnLdvIXEvcTAvMPHx8fFytHR1tbw3dLv48vh4eX489gZJC4eMEQA/wA/AD8jLz0gL0M9PU8rOEI/f39CTVhBT2BRVmRra3ptbZFze4l7gIt/n5+IjpqEjJaZmZmmqLG/v3+2u8K8xsbUs3Hbu4TdwpHdzKHeyqPHytDa2ubf4uT/qgDivH/iu4PkypXmzp08glpqAAABAHRSTlOaK1R0BwD9/Qb6Aizw+f3TA9OwT/P+sewDUMywAy6OrlKyMM1ysk/v/jMCAo5K/lAB0km0c/iuNXKNUQOtjfevAqqRiFICsm6wArA1NGqRr5PJU02UVI8E6nBoAgIyAwEDcWQD1MqRbU0Zl+tSjNTOA1tsAZACcSdzmVACaATNzclta5BtrzNy9ANXjVHnbjTtLAQFNQFPyqhTbXAtTskyhwQDeExQlTJJ268EtlUyUK+ILNwzbjViR26LBJIFB5k2UOv1LC44ycMDBK4VA//PzjojTR6LHBsXZCuK/wEEvNw6ZARwu1s0B+jGCNDnBcwEnxs2o7Qeb6AVcwNQSB0/gPnSIQAAJKtJREFUeNrtnQd4FLe2gLn3Po3PlPXu2lu8a2PsXVdwwcbGBTCOMTZgY2xCABPqpUNISCghCQESkpDe+01u7728W9+7vfdeX++99/4kzWhGM6PZnS0mxmS+BIN3RyPpn3N0dHR0NA+9el1117zL+bDVi1/t8KsMOrza2zPUscruEMxO6Lha6i/ya1MotBOhvXu3PBlSlFdfHWfnzGJJvwPBvMcfRotzbdKd7t+GXiWv9w4oO+lPNdGr5qJI510+Mb83EGjNBToY7zC8qb9/z4GhiaEDdf1P7wAG/moHrvcOBj60X5PjsxD6QoSevamkJJCDpA/SJo31HhnRZHxJkkx/RIIjJ3sf0xu49qqX9Kd7kxruGkkKwqyDXoFVe6AEX/P9QidyDDdMBrtl2iaJMsd/RqNN5O/BWN1hKu9XrZ4H9YbqpNbNeue52QadqPZ1gZIAvub7qxpBnjoTNFoka/UTj37x5ZdfPjNRFpHYO6CVnU5drcgx4WMaJwqSdG6WQceq/Q2NJZS5P+jkK82TutqS5JFHH+PugfbJINP0kragH65W6B8pC94vm8xnm3r/JoKHSuiFod/qo2pYzFMTEUIW/x9LGL/du3PnTqPFe8KyQV2Sw+NX74h+uDcomdBnkyEHp5C6pqSEUfcn6dVUieP3uH4Y6AQN7BY9DOHPDDXfflVbciPSLISOpfbajkDApJ4VOv64OW3w1OpAZKqRX9QE2djedRVP0regxCyU9OMIbglYzLNDxy/JtGa8vfUpL+ucWIZhA3r11SzoVjfMGujMai/xDR1bI9WyMU4tgAze+r1mcyuhYJ++cqX6eeB6NW1BV/w3buagV+mqnWNO5umQUc5hAZuGYOaZWISQqmv4BXD1LuTAkxCbXZK+DFvtHPBSfGWBDjpzasPFMjMn1MupQkgWDj31xBX62sAWHrqwvyAlcmbMEHRYhFV7ievK5JGzmOPxPBtz8v0W8s39BUIH9Kz2RvXK1BZwpwk9LIKOu2ab9g1B42YG+mqs2htLcoJOxnPGXFNRKDstmMIqIVkYMFzK8mjsCh0icLWzQFe3ti2BywS9AsFmAXJiyC32HtCn2dxb2ogUP03+pCZJj6hIKajfGmRp5RVrF2DdKGeC3iVJlwk6MbvXBXKErqBm0+PiT/Lwl5ZIUry1EOi4jKR0xULnBkTRmA7U2K29LNCBWO0l4ssTOq7gfsZcTvljAOisFtUKgn49dEnyHIWOP62UKPSZN+TuIA4ZzmQvNU33kpIO1QM6ELOMafch8N3mJdHI7QVAV5BKFqvKrmT1ngH6etKjy2ceus3XXmpcBvzAZvAS9AdQaoBB979KqKDW+6VytL1QQ2hOQsdtIp6M6MxDX2ha7Yy1pdrXzEfeyt00QyXpUi7QaoOFSDoxdOYMdGcTYFK6LNDv0B0yTKfzo/mGdwNaBJ4iW2Na7nJzLhShAFoh1LxvzkLfi26QLwd0w9cuujpuAaoGPCV2pSnoJ3Mh4P1NUOiV4aUwPbnSER+PBFxgSPEVgW1/JmSrh+8XGBTvKZtb0hsi5uLEDEJf6OGQwTO1i0D9Nd5jc4Mp6HiOntOLJl6G28m/84PCr7zPWqI6AkqV/o4ouwdFBQ7aXEVVmVzJtocBf1/meD4IZQG+28N6lwVjOn5ST9D4pNJ4/UnjdkORoTt87SX2wbwis8/9ANPtOcb9CF+hkP42NI+Njd2qvxSu/obd3OqsdAT5wAGp8cRYs0d5+jeq7C+i/gPUHWNjL+m/g0w1xveJP4cqFu0MmSRd4SucYAvU0nI0Y5KOxVy9Sci84xDyHswZdFZFWYoV7EvHV3NXZTiukSsYruztQUjguegyu0UagaqeH/1ofHx8bHy44bCgPLX9QH2YlqeFF7Q0gLs8JojQ0Lc8fYzdCIkDsaCmDUTwfZV3gRs7HjT2Gn/pr06eb33AaYJD1U4DeM2eZLzcdb/Aeie+sQlLc1bCm3aMj+/Y8ePh4eGbDxcTuhH86L5uvCezZtevp83+lz5QuGlx2oqZpVdkZcK5fqMOx2QzvswItCRXJBKxL9ArJBazXpNt5aVHQbA2AFBTHQtG8FdXGTea8bz6Q4K9KhIZqZBqHwrjR0Q91kehc3ooqWlSFE9PFR9TNtgTtB7KGjegaRHt/tHiQYdv2nztnNm+yQ9yhCZM6PKOwryqCKpJ9+EeTiaT2m+zUheoDqeOLHHM+Ss6xfU8Ka8uSMuLk/K6DU+xPKU6Hvyzuok0ezXkVRT5B4LsjbLCtuvsbx9W6GO9C8LeMU8ADXsqj5oFO6G/z22948bVCxvGB5cVATqx2m8qKbWvnJPrtvvwUJ/dLiZWNKvnewtbMkMNNJQkvednQK4EU3NtGtdfxvocv4mC/GGE2J63eh7/LKflhXt7aHnjQxpbB2zgK9puE2mpjxhSZRIvbsaD5Jjtben8ku0+hz2DO6Y2wr+a8u2Ol+J3TehhVmsFqXFZ5raI0P+ZJiuapC9EgK12yw9DvDJsMD/lg+Fu1NBtMvjNwlzRLTQuus56aor1fbyT6zBo6N/Y/pWx9xrdMvLzD36tnV1j5rcWI5imAwU31VXrjXs0HsDpfYYaNaBj/aAH9Mrv2ce9VKSVR/m1gs70AK9yguCUhsrIgLWhgUi6fTZ4p8pBZ5u8YAw3rr2LGUmVPR/SG7Zx43T7T4oEHVvt/xyw3Oymdr/bn2YnV531Mk8WxLyPtrSX/OMEkUxsTptRZGmXhWhM02X5iFd5x2S2FqBQSX8AEY+CvscgbNPFzdNJC3odWemQtdiex6h6+FBMs0K22/DbZ1HH9tlyzaQadIsIlK8Imp8LoFe6oRuNixjQa2fAel/EfO12n+um+cQ/55PVAQt6b/41OQGjVJzCPN3dqJO1vpq3z0Khv1XMOVsZcbywixsFtlEDHw+XVfwSDdth4FizhCFTZL9d2SZp1ZwihzOa2cK2sGPkNgsUQSc3x0wlnRE6WDOJ3U+Fepgxuxy2mG0LFWWe/ozYIbPh/4SDOYjSj9AR1hy1EgUIeithJEsHHB8cMKBr9jUJxTIlhG5YBUGYyljMNn/eiQzFKdnW95QtCNJMJLWoFEuR71L9QPeQp7ghnpuVUmVkBK9TH8UJZy2q7kRnNSkn6LTyzSb0Yks6btJm++ScSLvHNG31Mg93nLrVgt6Q7yydxD0ZtrO9Y1CKadYWG1saNK53twg6/tUKqsilpY45HHPe2lQHghBdHKbltcm99qk8sOUPVkNbgRCUvDek4a+qzOx0Qd+SAbqhW5qK7nvHlbzRLuOlXtM0WIQV2afnE93ghJ6ydN++VP7QVaOYVc4qJvU+a0o6oQdN9S6Ebmj/pY7bTIvZZiVg6KOyYeQRfeWYeD5gLi8QI5A35nAhZZmhkwCh3KEPmOp9xqGXbLhWpNkXPkOQP97Y6V5cpS8lE8Z9efvjFCMkWpIOOOe61Qb0c2pO0NV94uAtPQqXaPGUDTraxgzmpQKHq6IrFjq7sIWJ4NKPZIG+1BM6ZFfvtcWHrgoccG7kRMrf2Ui3Kgug7+guCvQaySPCbo+lHXf5hq6gTqNSYfunWKIZgxq7h96CDh6rSqYZ3mzzGmST9BWS2DkDv5EBumxBhyJDf5hfTGu8KFpAXXiKIH884LGtaTsas3wJhUBPGVNhF/R+VvqoyydkRtmLJNMYLtL2/qwylgTxH9P2ldpt7DnXiFoBnH0f5UhkgU7G/Oo8JL1nxqCfQq/jvDJ0mgZCKX+cbGnDXxRI+vXoMcvplD90fewmndrn/OgGWbTDlYO+UjymV+q+NPuYjr5LxhG9xBb7YvfNGaET3cGMl6imCqGr4pel2lPS1VcA+mL0GdMrQxxwbuRkHvpQI8k94h0N2y8VATq+r/MoTWPgKsIsvy8HSScVT5KO2+9ws681jQepzv5JFuj8Dh75oMiQC2eH7nvK1hOZKejPYOi6VyZwj0CzUynfzG9hvNUNfTt6k+Wj3lfQfhW1OhbrcrcxC3TvEGh1RSzW62CeP3R8jZpvd7X5lWzQUQZJ3/JKQEfonYZmV90OODpJ29yoz+O8M1EoaNxcHcgxQE587fLUJKtyhM6tqNsNsvyggzkjl7l9lz6gr/CSdOTPei8qdFzcvTQ0RjBNo4p9cyObvGeC3iPzzpkCoCsCRoVAV8w/hHPDPKCb+t1K9pcb9F1+offMJPTv0aDHRYob+fyLTgetB3TVmqfLd2HDrpgXKJ+9c6OcEXpO25pAeSpvSeeXlixNXYCko0zQB2ZS0jerrsGcjOXz720U7mUTeUHS1ur2imICN6LbaooFHUI0tkntFkN/fTbo3Mggr/dryPHQb88B+syN6fD2T7hsdqrY7230u4GRC+nE10TxRNxY86w7so8thBQEHfRgtlT7JTPSpStn6OYjsUqz2l8/E5I+g4YcQotWe47lvjYwguknLTSIgivzAfqnOjo0YqWYlORj+ULXy0Ow8dEyTZZMb2qu0LlHWqs/XNB/MLv17ht68wxCP+VGjhV7oCSnXavrLUvu9wrfbKLLOPSsSGrdNOVkjK10HMttnm7XGc11MRqrJgcrdedMPtBNobZBj3nuWHBB3zUboNsuEmswf50ncY/sUoPEUyVbC+qFzdl04okJGrUma7HeMZRg0N+cB3S9vJqJEZp7Vx659BioBUCPiSVdLoKkK68EdCrl66wJml/odBFTLkLojDFfg4YhEsAalbRYO31aezbo3nvZaHnjE7qIa/V7niC/HO42oOdqyCEO+grODZuDej/hMQd8RaADQf4wlfJSPi7WX1KCaisCuaDNDthaV+vS+npIeg/1pYWegv5s1rsndIWUF9bLC+9pJr/aqUAD870XAn1aoPPzkHRP6D0zD31hNsVu+GiE0E/w7pmgWoD3HUGLkRE7RrLK0u1HIWvBJUfopLxVcWMESJBv7FXoKlt34dDlUZSXpINfSZ9x6BX4+c+uc5pvLjH3gm4FqTgXqXMdzYeN0Nf0sLWFaHu+0PEvb07r+2CCFLliGC7l+c7TzTFdJq7H7QVL+isHHTBydC2x2B3RciUCNe+h3sHyVOWYAtKK2SBR791W7Ay3xzA/6KQ8IwH5BF9elacb1p/1rgdQa60sZLlo0C/jPJ0o9teuC2TR7Ibge2SXsgIWSEhofjnCMMPlxqaCaRL5zF2JfKBzoWnY5toJ3BSlXBZnoD7oA3qZFTW/1uWRC+a6tJoB+swZcsR8g2vX+EBuWO9eB/dYeQNlude/+x23p2uBqou7HgyL+3OFc5FELOlKximbHpkm0y0i4IicyVvSFWt7dEy0ypYrdJQJ+gz53qnFfu0638QDgTUe2aW47WyyNOJfvyvo7NEBGlqqGOljRDtZxKts2aCvl/UI6LhD86wtBPrtTKO1IIHvPQhe0GXxBsZM0LWZgA7UfFuTcV5uY77pul9lENk6M2jQ2ZcZBf153YSxAqCxzlXES6uydMwF3WuzA5CtC/qmw2qwK561nurdh/WeYDLbyW0nt8b02Q5dt9gDjt1MHmN5yY2b3pEpFQOBljR3BWl+Z20Kao0zxzlLQ6el0KAHdNk/dAWNsso4V/gLiZxhijqatAVGZjfk8oIus80OxYFOpfzadY0+Nftt15HHLqpYmEloD0aYWy5aCSfAl6Crf6mvlgxaTj2BUWaO6f6hEwtBFkuf4inpJvSlnkEUsTbjTvAdGIm/0esRLuUHerGyS9FJ2n3rfJpvjDhk09RsAVFqknp8GfBA7eWTFPqnNMkzU1TCG7qH9a4rHj01iVu9lLNxyAF9WxZJP8G2khI7YZBr+RG2265T2G7PGDnv5IF4ymZCR0WArs/L1/gZxUsCa3wRN9qeND00vhK7YWrpKM0SBFweupMZoK/yC13RN0Pq+Whcj23wkHRzs0OfV/VXsYrAYr7hk8xjMyrsmfygR0y1WTB0qtjf7cN8CwQ6Nv23X+Jssh61suNkpc6mMicRiZ3fKHlb4lmgy+682VyI+ohAvXe7THAX9IyvtfM03EssUUWlcNeFuZSWC/SPypJ3Su15uY/la8SLKby7taTDsNwq/HvXrAkNbn8Lyi7r+jL8aTt0gW/nLitDhJ1BUPKwHDHYiORhyIUsSfeALveJ2wcH9bdF3uZ4XB3LUSIwYdci6JPygP4Ea0C6sJMd4DhB/v1GPsBVeN1423W5yDi7rkflmu6wkmkKkbWZF9SMVfg6ZEszKidsiZ/IOW9mRpsWl3tMtIivKLyLUOq1JWoEZI0KTS0glvQVIHbln9e9PY5JFFUdsrmwDI5mwh4p6hX3bkGPOw05eI69tbYtsnrGy3k5SfmnWa640mIT16/yuJm6pQUyHOmhn8xGv7gRvyycJW6z5EiOwAaNZfqRhoSrHyTpCdhW0PVpuijlE34PU+biUJNjuByWreFC1PhR6u4hB5Aobo+8OSnjd8JW0WmEFGdj/jbXnSzoBtuAVfZPRtib0gKKrXE5QCeuzkMd2Qz2gojTdK1JmRvXM8Q2dMaN5o5T3wwXh9HFVkdIIkbok6Nxa3i7HvjEondxGXwM2viW5pfI34bMFX5cjy36hyRR2HqtLc60AD00yMpTcTNLOCZyiCgsUYYt4xEz8MxGx1vxP3crpFgaetuwX5L+5u+iIqPENsnQtjlFZFKyMnA8SRcdSX82tJKq+Zf0F27KOEkLBAKbCiJuPMZKdhhuELtzSFzqetbx72nWw1v6rMVZy46C8im5Lai+lzW/1d5lraYOD5ubl2A6EiOIbpb5LUjsSlXK0XNn9xsfDHTa6mUlyZI/Ag4XUYicXEHqEC8XZONX4+Z6kzbNJ8FaMCDJta3mwkQtKPZlAGsUarF/tN0yX4ltywpskb7uHzqJcM9MvLEYxOlSycbnTHwH9EgIW5oP0mVwQLZveeT6Dd9W30+yqII6fR73Sb2K3m+e9qZyks7pd1kK6mnIoKvMGFhNPwp5Jep0SelfEIlGg83oCJPopEqTTjHoA1aoH8kpaVIgdVaTVFzjtwsavQjdxcXshqtraLGJFckBSerGr/AZpnSIHmDpiEHhNzFLW/FrW7UWbDEKrDZhGg4A6qpwVF4PvtU77tTHM/vVfRCH46fA1zAyaSLVVugiGKJZjLcbuX7rzGFVLutn4YUJPjOmFq5fmSYZO8lwDROWHNX21aZZ/ML1fMSOdH/9yUka70p1M1j2OzErcXkxEoYVbcLvkOUhk7QL19SG2b6FBtOnKDXJ1Mij1aYPuzVNvU77Wz1EaohPNChHgsGgRiMxgxgSXDIred6WExhGuRyBF1Sbn/sZPHhxaQlXTlamNblt4PVURvxBX4jUQKnH7CzgZxyHiooc5L0nZrZGm9xol/RxEvaoD8aRWI1gAZK/SMafLWaOCmNveI0BXXiPbO4nHTWTv3F77YZIeSk+z2M0Mmoo7Jtt6R/To9aQoeqHg0dqPW0UYoa7s3vSBJMKetT66JFvn1VZdumGSlvay0eOnVV5g9R8161LO6g3zh/0xehhscH+MR/EYWHFIvrzDZszncBoM6A/OqnHMFOxTU4++MGv/uNPxr7yZ6djwW4DuRw800wHSyvQxdVrxCpQbGeFSAMXeGGzJIx1y6hlwCc0e6LPNik8qpdXaeXgjFR2gt16N++JV3YlxpvHP1iX1HSCDZ4TEuBHLPOK36Xbsn/KvWJS/Ms/Jb9dn7RnKSYJbLWtX7fmDYqt2fTa+kvjhfZryL3BPYyX3OjDywoVdAszPPvQusaAZxCFe2RH0B7jmyVrur7T/9EdHhqjYWu7+Fdl2DL9m0j8ap3eZwpKsQFfq7zdnn0V6jTyXeMeuVLlTcdUzNavWi+bT7TGo/pN2gIuR6wJPcmmS9241rgRbdg8GJgaBuS9pIA/q+ET+eK6xFtY0uhLUStZ9b73SB8m1fgwGQVo3mozgzXmvrWVz2YMQ3z96VAJ/qds+P559hA44mX9n2zEQaE6Hebfsq6DpBnKfn66DTvmfqksqDkkAA94J7/YA+aXbNZA/yTNvY27Z9/Jdq6TX6ofwN1TTzMMOH0tl/AjaKeNPNrscBbB2MlztFO7B4L1D3JVV1fi8VtLVzcDF5plQu9DTz9ahlUS+3ckONLbDCjjUaKk9k+f1GuP23iOVt/orQ9owXD90J6Xx1Km3Qiqqr70RCp1GP93+HDqMLDL4Zh6lJYoa+fK6ri8436h/4txKHapQfwdWYlXnKI/rt1sOHQCgYB/6NaBCjsePDM0OTJShq+RyaHe9q8B82qKFcSO/rr2B/s/6ly+7+mnqsF5Fgft2dTG9umNj6Vc7xH9xxM3PNi+8YYdzvKa2+kUgQ/ANL2CS2ipY3e1DC2IxSqrpxPgUWF37Z/of3DPngfb9cexWd9hNb8pEb0r1f+h9n57eb6h/8CapAc2UK1+hzdxWG2I+AtEp3Mz+VtzCmr3PNdkr0cHep6ZYrDcCx46RfB3c36YoTw7yGHLJ++u+FofExfb491HhuykBwAZwmydzKKA/nsF3OeBKOLy/EL/fkBfLS3ZkG0cX22I+Ls339TocOfkCF1vXIg/hScUynJgEuipfV1fUkKeB+fAoD0TsOtGQXnkMc4uHrYtxIASMusMObRW8DhQCjiJTBFU3yd0lSQFCzRms9ygapkxiq9pdPnvSkmiobxrD7P+6LQac2l1ttfUJ/Szj2Pit2RcLV2s63SkvnCxo9HDY3vrlXrqnW/oZMY8V6DPv3jL/EwyDhW6iN93z5rGDK67uQ997ki6cXkQh4XWzIxIeKn3frb5VwF0V3DFFQsdTnnEsq42RNycmYk3L14l0OU5Bd1DxHXgr/Ew264y9W4uZtbOWeirdYe6emhzR8D3ZrY5LelsY5W0YE5Ch6q36mbb5g7fvOe4pPOB+2Uwy+eXuce9rz6ui/jH13V4jN6lV6Gkf9fY/WZEXz0JcwY6ttMNs+0eNoqLQqFLPf8xR6FT59u0tSiUpAs7Clz50NnM7D59zawkn2vuSjr0DXBREFPlc0HS4fgyw2y7KV/gc3dMB7VhRVrWg9rZ4nWy7+BZ9VtXLnROxBsDBRCfo5IONG476o51iv87zNLmzssG/O9P0Z+HNumGegHM6RkucxE6LA+XpdPpMv2qN36k08NXono3ohmpQ93mXs2aicA7j9ycHNPdUSsIzeZp2zzPdlBDHX718Yu6Q73Uli2sNC9ZD8xp58yVc80Te9tMh7p7FC/Nk/gctt7BdSG4oiTdjIP4+BqhfzU/1U4j5BpvUl+V9FkH3fS2vYPEQYgdLPkx79hw8ZZD818lPtugrz5uxEFsdmYDLM2Q8dXrFaAJIkk5HRtuu+fQfTnkJmDXoOLWoqaTS4FBd5JHzgcmcocZsYSealfJ8jn+xqBXRKaHMsePDIlvAXfzyGnqZvykMjjoVWLhrj4DOrxF1+mH1gmWUDJERZRmcLR3bHjbPYdeY1Rw0bKKioUzL+n+MoxmiVQMFamerJidxWq3cawIMvZOF0HS1dda3ja7Di/NKtfOzU4bNt196BesYssqFq72XclfI0Kj4iuVckZ7k1+zLZtqpzsWHMyPEaTeddjb3BK/HKACsF2oHvKspsQR6HC4tVX8wdjTiZT4E3fzEHR+ympgKgWilwge+8JXmwEVdv4Fhf4MUh/a4JkVrjTTeG7/xcdu3PC2t/86U3WL/ut4RW6qaBcqj2uaFid/aEnHeeewNB7vA3SCZvKIH329s+SDR+PhBn0fU038fkc2aXI7KTSuBYMn+4El3jav61GNdj95clxL14H7GEdy9eEP+0QpRdVrtPjzgrxkBzRNlrVwn+r251RqcUeS87Woc6umHSMv3SAq36p9udW1hQfKP69FSIldhfn6DEn/TMCnT000fSPq4cYbN9yNcbNilx2vgMW512YXy+LT1tYW1ZyH3F+INlXr+4ghHZXWO5tN0nQeJbk9QighRctc0GstD+mUKx2Rgu9pamqj+xS5QzH5L5BsvtFHVFFSgSV0WwvYv9+61dhzKG89CM70zWWSlHBB16So9kt851pUrkW1VleykVX3S9E2UkP5fEHzoHm62liXv3u1Eevyf/pfVoVTyypW5z9D3UXPqZ5KTk3FYvUT4ITeRNJw7zKOzV7vzAhVw7Jy7UYJuaneBX2JLB3F5YY13G1b3QmlamRJi5WtTG6VhQlVQ0bOmIMi5/tSV5pIfW/r71e2LCG7Kt0f1ruOM1iLUpqeQVQh0F2ZiEm2jagUmVpSi2vY9qXWAjS8Dl29KWfoRLo33Ha3ZZjf8dZiWGrlkab3g8gYxh11wTjvxoCO3NTo4ShKFQlXW+lW7zLNTAJqNe60N7oEE99zhHxMtjxrqjPDLM1NIV8QvQ9C6DRBlVZODIn1wSkVuSXdCR0odFrQtwzog7aPSZqE5KdI33TJ0tazBYg6gV6BHvYa0EvFuDuIpfZz9tS3Hl+tFMf/tIu0NmgMgXc6O6rWOJZTh17j0s9EEqORFHqK/LVeBL1a/8e0LHW/KLi9jN6B1Xh3g7tunZHouVaNpAKqcr0PIujjZpIbEGSTF0Nvk6kueQp3Q1tc5ZOq4VumaFI4en3hD6DAMR2X91DAJ/QAnofdfci01Ja9pRBl7gXdK+EiBz0tgF4jR2MxmvPJA7ouplBFt+u7srnVEOjv+/O/+hyMuKGT0aGpKUZubHFbbKToJc7yXsJye94IplBE0BMC9b5/Kc0Jh6U6ak8Np59DfJBOJ7cUwTmDy/tBNhcqxX3xOs5Se0tellrWme3tWCmOPrinrqur600C6NUW9IRbVJt+i6RbwjKH/+o25LC1tdz4ex1N5wZ2611uWkl/U0dTNyoCM2492ogHXdUN3W3IEW0UxQWlK+tU0QvsAX2kFT8GDz3lA1FnMtGEZ4K6fKCvRmpjZkttw93X/dCS7lznYblJ+oCRPlCWphyGnA/oIyT3zsA2dIPQkMPQjX2+CVdCWJKDK6pV/+EfT5D0EwvcGWHX41vICRRRlyknhI70tIV62hxVBN1pvQ8S6GGV7H19M7nXCb2O5nlF0LtgQSy28vP9hUH/HVduETYPIy7UFz7BHk2cajPsU9Otd+P82vNO6MubmqozqHeq02mGRdULujGmoxskdxZgLh1RWDAIY8V+Bv96wo3XCzpSJ4J6Nop4Oco+ZVMw9Ci2Z1qkJq3zXd7Qw9GmaNRqSt7W+70l7qF7090v/CtYs+6Flym2E0M/V3fm9OnTvac3OjtqeRNvyAmsd6LT1aNYUFtF6p0pCmKgS02ufN+jNE9HN0bUIjjpoVPT/QatclvcPYEWQv8jkgvrdIzMw6ZclRFCv59Ah/3RpvRZ2aXe8chC7Dg4oifPPV0QdDJh49Y/Ce53qxzu1Zd1YfjFiPT+DIZcJV2rVjys92gZ/pS4d/5ajnpLOtB+rbS73bZTQ66z/MNS21FVZJ+3SVrZSFnZiEyydUJWQ477uFpypu8XWu9M0pF6rin6F5rDN6WgZjwb+E8UQoff9R2YIIdaFQJ9IXpd4HsYeGPHmre9/RMmYWypvRKB258kU7YtT23Z8uSTVc7ee56OxGgv7pdu13lVFDpNyU93mkTTGcb0UalJ2mYvXIdOdEhbtNY9oqvxqGSmkEyCYwYthj5Wg3/xuRBJZqm96B4tnNDJmB6lgw7NY97mst63StIFQJ8lDuRLslQY9EXo3zrWXLzuhypnqa1+xVa+sSH3nJfMvEgypZKP1KTk0n4Ko0bkWHK5UnXoS+lQ+2bZdnSOYb0Pk9ur4KAclX8KzjnWeqlJ1oLxuEayXckvZpd0YndoH6G/OUgn9w5JTwqgd2o6aT1PXdy59HBMlvRElEiNSQVCt5wHl8FSy3KdIB6551Svc2/eSFIvr+ir1qSmJvfKx7AOnST6bZOcUzLqnJG21k5WTsW76aFOzmds050zpMfd917AI4u+BIdfOMchLSLoxuGAyWuO3bVEoxIKLujr3XYDWTsA4+zZuCrw60rplumuWpL7rqVA6Bj3Wy/Larcf6HLU62BlbHw80kbt+jbhgR8mdCITIuhW7sFkp2uZzYBehdQBSXrerkQAy6DJaJVMBBeyqXeoOUqXRoj5frTTZQUk2yQBdF1/0WNiRPYiTQHZ3U2KrVQLdMPOphC+T8Yjj3i1h5ynSnPhDcT7BAZ2jRZZaSzCDcmRKRf0b2iaNhCJyNqfdLnLx+pdixCdvx2djgzwmRfpmX+RCLacqxQF8EsRj2j/APbPr9E09xFN6hBNfChr5zvdSisZ0ba5oB+V9QcrqGVAfuSse8G9V0+eqiXXEwEpdGl11lwwXLMDvKfx8K666hUrEqoozuFwTWKc5XXdkXCVAs01NQl8jQuDKE6Q240UgTuGx75j/3S8JtFjlZNI9Dh8cs3DP35ClJl+45mJ6roGECyI9SQS/+H6ek2N2YBhoy126gj6zxyo7uoBVIz19CvkUvgOyOTNzXyFLotqA0G1i1ViqFA37OyS9KqqjCnEaVLIKkV8qzXHBEEpuGhyDXolyDJvd9dBqeIeOeiuoiKuNa3sTuFHojtIBcH1V/tXSJRcqKrAl/bKkvRXr6Jc/w9+yNtjCLidbAAAAABJRU5ErkJggg==";
const LOGO_BUFFER = Buffer.from(LOGO_BASE64, "base64");
const LOGO_ASPECT = 500 / 123;

// Brand palette — matches the Prospect Intelligence Profile PDF.
const NAVY = "15212E";
const BRASS = "B28C46";
const PAPER = "FAF7F0";
const INK = "181B19";
const MUTED = "5C5D59";
const LINE = "D6CDBA";

const CONTENT_WIDTH = 9360; // US Letter, 1" margins, DXA

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRASS, space: 4 } },
    children: [new TextRun({ text, color: NAVY, bold: true })],
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, color: BRASS, bold: true })],
  });
}

function bulletList(items: string[]): Paragraph[] {
  if (!items || items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: "None noted.", italics: true, color: MUTED })] })];
  }
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: "ask-strategy-bullets", level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: item, color: INK })],
      })
  );
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: text || "Not available.", color: INK })],
  });
}

function highlightBox(label: string, value: string): TableCell {
  return new TableCell({
    width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: { top: 160, bottom: 160, left: 200, right: 200 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label.toUpperCase(), color: "CDAA6E", size: 15, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60 },
        children: [new TextRun({ text: value || "Not specified", color: PAPER, size: 26, bold: true })],
      }),
    ],
  });
}

function objectionTable(rows: Array<{ objection: string; response: string }>): Table | Paragraph {
  if (!rows || rows.length === 0) {
    return new Paragraph({ children: [new TextRun({ text: "None noted.", italics: true, color: MUTED })] });
  }
  const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colWidths = [Math.round(CONTENT_WIDTH * 0.42), Math.round(CONTENT_WIDTH * 0.58)];

  const headerRow = new TableRow({
    children: ["Anticipated Objection", "Suggested Response"].map(
      (text, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          borders,
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text, color: PAPER, bold: true, size: 17 })] })],
        })
    ),
  });

  const dataRows = rows.map(
    (row, i) =>
      new TableRow({
        children: [row.objection, row.response].map(
          (text, ci) =>
            new TableCell({
              width: { size: colWidths[ci], type: WidthType.DXA },
              borders,
              shading: { fill: i % 2 === 1 ? PAPER : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text, color: INK, size: 18 })] })],
            })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function caseAlignmentTable(points: CaseAlignmentPoint[]): Table | Paragraph {
  if (!points || points.length === 0) {
    return new Paragraph({
      children: [
        new TextRun({
          text: "No profile traits (interests, boards, relationship, etc.) were available to compare against the case for support.",
          italics: true,
          color: MUTED,
        }),
      ],
    });
  }
  const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colWidths = [Math.round(CONTENT_WIDTH * 0.22), Math.round(CONTENT_WIDTH * 0.3), Math.round(CONTENT_WIDTH * 0.48)];

  const headerRow = new TableRow({
    children: ["Profile Trait", "From the Prospect Intelligence Profile", "Connection to the Case for Support"].map(
      (text, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          borders,
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text, color: PAPER, bold: true, size: 16 })] })],
        })
    ),
  });

  const dataRows = points.map(
    (point, i) =>
      new TableRow({
        children: [point.profileTrait, point.profileValue, point.caseConnection].map(
          (text, ci) =>
            new TableCell({
              width: { size: colWidths[ci], type: WidthType.DXA },
              borders,
              shading: { fill: i % 2 === 1 ? PAPER : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, color: INK, size: 17, bold: ci === 0 })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

export interface AskStrategyDocxParams {
  prospectName: string;
  clientOrgName: string;
  catapultId?: string;
  generatedDate: string;
  strategy: AskStrategy;
}

export async function buildAskStrategyDocx(params: AskStrategyDocxParams): Promise<Buffer> {
  const { prospectName, clientOrgName, catapultId, generatedDate, strategy } = params;

  const logoWidth = 130;
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT);

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 21, color: INK } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: NAVY },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 21, bold: true, font: "Arial", color: BRASS },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "ask-strategy-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 360 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 0, bottom: 0, left: 0, right: 0 },
                        borders: {
                          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                        },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.LEFT,
                            spacing: { before: 0, after: 0 },
                            children: [
                              new ImageRun({
                                type: "png",
                                data: LOGO_BUFFER,
                                transformation: { width: logoWidth, height: logoHeight },
                                altText: { title: "Catapult Fundraising", description: "Logo", name: "Logo" },
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 0, bottom: 0, left: 0, right: 0 },
                        borders: {
                          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                        },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: "CONFIDENTIAL", color: BRASS, bold: true, size: 15 }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
                children: [
                  new TextRun({
                    text: `Catapult Fundraising: Confidential Donor Ask Strategy${
                      catapultId ? `, Catapult ID: ${catapultId}` : ""
                    }`,
                    size: 14,
                    color: MUTED,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Page ", size: 14, color: MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: MUTED }),
                  new TextRun({ text: " of ", size: 14, color: MUTED }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: MUTED }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            spacing: { before: 0 },
            children: [
              new TextRun({ text: "DONOR ASK STRATEGY", color: BRASS, bold: true, size: 18 }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { before: 60, after: 40 },
            children: [new TextRun({ text: prospectName || "Prospect", color: NAVY, bold: true, size: 40 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Prepared for ${clientOrgName}  •  ${generatedDate}`, color: MUTED, size: 18 }),
            ],
          }),

          heading("Executive Summary"),
          bodyParagraph(strategy.executiveSummary),

          heading("Recommended Ask"),
          new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
            rows: [
              new TableRow({
                children: [
                  highlightBox("Recommended Ask Amount", strategy.recommendedAskAmount),
                  highlightBox("Suggested Ask Range", strategy.askRange),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 200 } }),

          heading("Case Alignment Points"),
          caseAlignmentTable(strategy.caseAlignmentPoints),
          new Paragraph({ spacing: { before: 200 } }),

          heading("Key Talking Points"),
          ...bulletList(strategy.talkingPoints),

          heading("Face-to-Face Meeting Preparation"),
          subheading("Preparation Notes"),
          ...bulletList(strategy.meetingPreparation),
          subheading("Do"),
          ...bulletList(strategy.doThis),
          subheading("Avoid"),
          ...bulletList(strategy.avoidThis),
          subheading("Suggested Questions to Ask the Prospect"),
          ...bulletList(strategy.suggestedQuestions),

          heading("Anticipated Objections & Responses"),
          objectionTable(strategy.objectionHandling),
          new Paragraph({ spacing: { before: 200 } }),

          heading("Recommended Next Steps"),
          ...bulletList(strategy.nextSteps),

          new Paragraph({
            spacing: { before: 280 },
            children: [
              new TextRun({
                text:
                  `This ask strategy was generated on ${generatedDate} by combining the Prospect ` +
                  `Intelligence Profile with the client's case for support on file. It is a ` +
                  `recommendation to inform gift officer judgment, not a guarantee of donor response. ` +
                  `This document is Confidential Information of Catapult Fundraising and its clients.`,
                italics: true,
                size: 15,
                color: MUTED,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
