/**
 * Canvas合成
 *
 * @param {string} base 合成結果を描画するcanvas(id)
 * @param {array} asset 合成する素材canvas(id)
 * @return {void}
 */
async function concatCanvas(base, asset){
    const canvas = document.querySelector(base);
    const ctx = canvas.getContext("2d");
  
    for(let i=0; i<asset.length; i++){
      const image1 = await getImagefromCanvas(asset[i]);
      ctx.drawImage(image1, 0, 0, canvas.width, canvas.height);
    }
  }
  
  /**
   * Canvasを画像として取得
   *
   * @param {string} id  対象canvasのid
   * @return {object}
   */
  function getImagefromCanvas(id){
    return new Promise((resolve, reject) => {
      const image = new Image();
      const ctx = document.querySelector(id).getContext("2d");
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = ctx.canvas.toDataURL();
    });
  }
  
  
  /**
   * Canvasを画像としてダウンロード
   *
   * @param {string} id          対象とするcanvasのid
   * @param {string} [type]      画像フォーマット
   * @param {string} [filename]  DL時のデフォルトファイル名
   * @return {void}
   */
  function canvasDownload(id, type="image/png", filename="photo"){
    const blob    = getBlobFromCanvas(id, type);       // canvasをBlobデータとして取得
    const dataURI = window.URL.createObjectURL(blob);  // Blobデータを「URI」に変換
  
    // JS内部でクリックイベントを発動→ダウンロード
    const event = document.createEvent("MouseEvents");
    event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    const a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    a.href = dataURI;         // URI化した画像
    a.download = filename;    // デフォルトのファイル名
    a.dispatchEvent(event);   // イベント発動
  }
  
  /**
    * 現状のCanvasを画像データとして返却
    *
    * @param {string}  id     対象とするcanvasのid
    * @param {string}  [type] MimeType
    * @return {blob}
    */
  function getBlobFromCanvas(id, type="image/png"){
    const canvas = document.querySelector(id);
    const base64 = canvas.toDataURL(type);              // "data:image/png;base64,iVBORw0k～"
    const tmp  = base64.split(",");                     // ["data:image/png;base64,", "iVBORw0k～"]
    const data = atob(tmp[1]);                          // 右側のデータ部分(iVBORw0k～)をデコード
    const mime = tmp[0].split(":")[1].split(";")[0];    // 画像形式(image/png)を取り出す
  
    // Blobのコンストラクタに食わせる値を作成
    let buff = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      buff[i] = data.charCodeAt(i);
    }
  
    return(
      new Blob([buff], { type: mime })
    );
  }

  //-----------------------------------------------------
// グローバル変数
//-----------------------------------------------------
const VIDEO = document.querySelector("#camera");    // <video>
const FRAME = document.querySelector("#frame");     // <canvas>
const STILL = document.querySelector("#still");     // <canvas>
const SE    = document.querySelector('#se');

/** フレーム素材一覧 */
const FRAMES = [
    {large:"ougonhi.png", small:"ougonhi.png"}
  , {large:"hakuginhi.png", small:"hakuginhi.png"}
];

/** カメラ設定 */
const CONSTRAINTS = {
  audio: false,
  video: {
    width: 640,
    height: 480,
    facingMode: "user"   // フロントカメラを利用する
    //facingMode: { exact: "environment" }  // リアカメラを利用する場合
  }
};

//-----------------------------------------------------
// onload
//-----------------------------------------------------
window.onload = () => {
  //-----------------------------
  //カメラを<video>と同期
  //-----------------------------
  syncCamera();

  //-----------------------------
  // フレーム初期化
  //-----------------------------
  drawFrame(FRAMES[0].large);   // 初期フレームを表示
  setFrameList();               // 切り替え用のフレーム一覧を表示

  //-----------------------------
  // シャッターボタン
  //-----------------------------
  document.querySelector("#btn-shutter").addEventListener("click", ()=>{
    // SE再生＆映像停止
    VIDEO.pause();
    SE.play();

    // 画像の生成
    onShutter();                                    // カメラ映像から静止画を取得
    concatCanvas("#result", ["#still", "#frame"]);  // フレームと合成

    // 最終結果ダイアログを表示
    setTimeout( () => {                // 演出目的で少しタイミングをずらす
      dialogShow("#dialog-result");
    }, 300);
  });

  //-----------------------------
  // ダイアログ
  //-----------------------------
  // 閉じるボタン
  document.querySelector("#dialog-result-close").addEventListener("click", (e) => {
    VIDEO.play();
    dialogHide("#dialog-result");
  });

  // ダウンロードボタン
  document.querySelector("#dialog-result-dl").addEventListener("click", (e) => {
    canvasDownload("#result");
  });
};

/**
 * [onload] カメラを<video>と同期
 */
function syncCamera(){
  navigator.mediaDevices.getUserMedia(CONSTRAINTS)
  .then( (stream) => {
    VIDEO.srcObject = stream;
    VIDEO.onloadedmetadata = (e) => {
      VIDEO.play();
    };
  })
  .catch( (err) => {
    console.log(`${err.name}: ${err.message}`);
  });
}

/**
 * [onload] フレーム一覧を表示する
 *
 * @return {void}
 **/
 function setFrameList(){
  const list = document.querySelector("#framelist");
  let i=0;
  FRAMES.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<img src="${item.small}" width="100px" height="100px" style="background-color: rgba(255 255 255 );">`; // <li><img ...></li>
    li.classList.add("framelist");              // <li class="framelist" ...
    li.setAttribute("data-index", i++);         // <li data-index="1" ...

    // クリックされるとフレーム変更
    li.addEventListener("click", (e)=>{
      const idx = e.target.parentElement.getAttribute("data-index");    // 親(parent)がli
      drawFrame(FRAMES[idx].large);
    })

    // ulに追加
    list.appendChild(li);
  });
}

/**
 * 指定フレームを描画する
 *
 * @param {string} path  フレームの画像URL
 * @return {void}
 */
function drawFrame(path){
  const modal = "#dialog-nowloading";
  const image = new Image();
  image.src = path;
  image.onload = () => {
    const ctx = FRAME.getContext("2d");
    ctx.clearRect(0, 0, frame.width, frame.height);
    ctx.drawImage(image, 0, 0, frame.width, frame.height);
    dialogHide(modal);
  };
  dialogShow(modal);
}

/**
 * シャッターボタンをクリック
 *
 * @return {void}
 **/
function onShutter(){
  const ctx = STILL.getContext("2d");
  // 前回の結果を消去
  ctx.clearRect(0, 0, STILL.width, STILL.height);

  // videoを画像として切り取り、canvasに描画
  ctx.drawImage(VIDEO, 0, 0, STILL.width, STILL.height);
}

/**
 * ダイアログを表示
 *
 * @param {string} id
 **/
function dialogShow(id){
  document.querySelector("#dialog-outer").style.display = "block";
  document.querySelector(id).style.display = "block";
}

/**
 * ダイアログを非表示
 *
 * @param {string} id
 **/
 function dialogHide(id){
  document.querySelector("#dialog-outer").style.display = "none";
  document.querySelector(id).style.display = "none";
}