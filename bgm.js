// 解析 ps 音乐序列格式, bgm 音质比 sap 更好.
import file from './file.js'
import Tool from './tool.js'
import Sound from '../boot/Sound.js'
// import Node from '../boot/node.js'
// import {decode} from '../boot/imaadpcm.js'


export default {
    bgm,
}


function bgm(filename) {
    let v = file.openExDataView(filename);
    // v.print(0, 100);
    const seq_off = v.ulong(v.byteLength-4);
    const vab_off = v.ulong(v.byteLength-8);
    const sampling = v.ulong(v.byteLength-12)
    debug(seq_off, vab_off, sampling);

    parse_midi(v, seq_off);
    parse_vab_header(v, vab_off, sampling);
}


class Midi {
    constructor() {
        this.seq = [];
        this.channels = [];
    }

    push(fn) {
        this.seq.push(fn);
    }

    time(t) {
        this.push(function() {
            thread.wait(t);
        });
    }

    play() {}
}


// http://loveemu.hatenablog.com/entry/20060630/PSX_SEQ_Format
// https://www.csie.ntu.edu.tw/~r92092/ref/midi/midi_messages.html#running
function parse_midi(v, begin) {
    v.setBigEndian();
    // 70 51 45 53 pQES
    if (v.byte(begin) != 0x70 || v.byte() != 0x51 ||
        v.byte() != 0x45 || v.byte() != 0x53) 
    {
        throw new Error("bad midi file");
    }

    const midi = new Midi();
    midi.version = v.ulong(begin + 4);
    // 固定的 midi 格式 0, 单通道
    // 定义一个四分音符的tick数
    midi.tpqn = v.ushort(begin + 8);
    // 四分音符的长度，以微秒为单位, 3个字节
    midi.tempo = v.ulong(begin + 9) & 0x00FFFFFF;
    // 时间签名的分子（n）
    midi.RhythmNumerator = v.byte();
    // 时间特征的分母（2 ^n）
    midi.RhythmDenominator = v.byte();
    debug(midi);

    let state = { end:false, cmd:0 };

    while (!state.end) {
        let p = v.getpos();
        let time = readtime(v);
        debug("--Time", time, p);
        midi.time(time);
        readevent(v, state);
        // midi.push(event);
    }
    return midi;
}


function readevent(v, state) {
    const h = v.byte();

    if (h == 0xF0) {
        let len = v.byte();
        debug("Sys", h&0x7F, len);
        return;
    }
    
    // 记忆最后的状态
    if (h >= 0x80) {
        state.cmd = h;
    } else {
        v.movepos(-1);
    }
    if (state.cmd < 0x80) {
        throw new Error("bad code "+ h);
    }

    if (h == 0xff) {
        const other = v.byte();
        switch (other) {
            case 0x2f:
                state.end = true;
                debug('END');
                return;

            case 0x00: {
                let track = v.ushort();
                debug("设置音序", track);
                break;
            }
            
            case 0x51: {
                let speed = [v.byte(), v.byte(), v.byte()];
                debug("速度", speed);
                break;
            }

            case 0x58: {
                let p = v.ulong();
                debug("节拍", p);
                break;
            }

            case 0x59: {
                let tone = v.ushort();
                debug("调号", tone);
                break;
            }

            default: {
                let size = v.byte();
                let pos = v.getpos();
                let arr = v.build(Uint8Array, pos, size);
                v.setpos(pos + size);
                debug("Event+", other, size, arr);
                break;
            }
        }
        return;
    }

    const channel = state.cmd & 0xF;
    switch (state.cmd & 0xF0) {
        case 0x80: {
            let tone = v.byte();
            let strength = v.byte();
            debug("松开", channel, tone, strength);
            break;
        }

        case 0x90: {
            let tone = v.byte();
            let strength = v.byte();
            debug("按下", channel, tone, strength);
            break;
        }

        case 0xA0: {
            let tone = v.byte();
            let strength = v.byte();
            debug("触后", channel, tone, strength);
            break;
        }

        case 0xB0: {
            // data entry (6)
            // volume (7)
            // panpot (10)
            // expression (11)
            // NRPN data (98, 99)
            // 78 关闭所有声音
            // 79 重置所有控制器
            // 7B 关闭所有音符
            let ctrl_num = v.byte();
            let ctrl_parm = v.byte();
            debug("控制器", channel, ctrl_num, ctrl_parm);
            if (ctrl_num == 99) {
                if (ctrl_parm == 20) {
                    debug(" - loop start");
                }
                else if (ctrl_parm == 30) {
                    debug(' - loop end');
                }
            }
            break;
        }

        case 0xC0: {
            let instrument = v.byte();
            debug("乐器", channel, instrument);
            break;
        }

        case 0xD0: {
            let what = v.byte();
            debug("触后通道", channel, what);
            break;
        }

        case 0xE0: {
            let portamento_l = v.byte();
            let portamento_h = v.byte();
            let portamento = portamento_h * 128 + portamento_l;
            debug("滑音", channel, portamento);
            break;
        }

        default: {
            debug("???=", state.cmd, channel);
            break;
        }
    }
}


function readtime(v) {
    let ret = v.byte();
    if (ret & 0x80) {
        let a = v.byte();
        ret = ((ret & 0x7F) << 7) | (a & 0x7F);

        if (a & 0x80) {
            a = v.byte();
            ret = (ret << 7) | (a & 0x7F);

            if (a & 0x80) {
                ret = (ret << 7) | (v.byte() & 0x7F);
            }
        }
    }
    return ret;
}


// https://github.com/paulsapps/alive/blob/dev/src/oddlib/audio
// https://github.com/vgmtrans/vgmtrans
function parse_vab_header(v, offset, vagoff) {
    v.setLittleEndian();
    // pBAV
    if (v.byte(offset) != 0x70 || v.byte() != 0x42 ||
        v.byte() != 0x41 || v.byte() != 0x56) 
    {
        throw new Error("bad vab file");
    }

    const vab = {};
    vab.version = v.ulong();
    vab.bankid = v.ulong();
    vab.filesize = v.ulong();
    vab.reserved0 = v.ushort();
    vab.num_progs = v.ushort();
    vab.num_tones = v.ushort();
    vab.num_vags = v.ushort();
    vab.master_vol = v.byte();
    vab.master_pan = v.byte();
    vab.attr1 = v.byte();
    vab.attr2 = v.byte();
    vab.reserved1 = v.ulong();
    vab.prog = new Array(vab.num_progs);
    vab.vag = new Array(vab.num_vags);
    debug(vab);

    for (let i=0; i<128; ++i) {
        const prog = {};
        prog.num_tones = v.byte();
        prog.vol = v.byte();
        prog.priority = v.byte();
        prog.mode = v.byte();
        prog.pan = v.byte();
        prog.reserved0 = v.byte();
        prog.attr = v.ushort();
        prog.reserved1 = v.ulong();
        prog.reserved2 = v.ulong();
        if (i < vab.num_progs) {
            prog.tone = new Array(prog.num_tones);
            vab.prog[i] = prog;
            debug('Program', prog);
        }
    }

    for (let j=0; j < vab.num_progs; ++j) {
        // debug('pos', v.getpos());
        for (let c=0; c<16; ++c) {
            const tone = {};
            tone.priority = v.byte();
            tone.mode = v.byte();
            tone.vol = v.byte();
            tone.pan = v.byte();
            tone.center = v.byte();
            tone.shift = v.byte();
            tone.min = v.byte();
            tone.max = v.byte();
            tone.vibw = v.byte();
            tone.vibt = v.byte();
            tone.porw = v.byte();
            tone.port = v.byte();
            tone.pitch_bend_min = v.byte();
            tone.pitch_bend_max = v.byte();
            tone.reserved1 = v.byte();
            tone.reserved2 = v.byte();
            tone.adsr1 = v.ushort();
            tone.adsr2 = v.ushort();
            tone.prog = v.short();
            tone.vag = v.short();
            tone.reserved3 = v.short();
            tone.reserved4 = v.short();
            tone.reserved5 = v.short();
            tone.reserved6 = v.short();
            vab.prog[tone.prog].tone[c] = tone;
            debug("Tone", j, c, tone, "\n");
        }
    }

    // http://problemkaputt.de/psx-spx.htm#spuadpcmsamples
    const core = new Sound.Core();
    let table_off = v.getpos();
    let data_off = vagoff;
    debug('vag pos', table_off);

    for (let i=0; i<vab.num_vags; ++i) {
        table_off += 2;
        const size = v.ushort(table_off) * 8;
        const vag = vab.vag[i] = v.build(Uint8Array, data_off, size);
        debug(' = wav', data_off, size);
        data_off += size;

        if (i==0) {
            let wav = new Sound.Wav(core);
            wav.rawBuffer(ADPCMtoPCM(vag), 44100.0, 1, audio.RAW_TYPE_16BIT);
            wav.play();
        }
    }
}


// https://github.com/paulsapps/alive/blob/dev/src/oddlib/PSXADPCMDecoder.cpp
function ADPCMtoPCM(srcbuf) {
    const pos_adpcm_table = [0, +60, +115, +98, +122];
    const neg_adpcm_table = [0, 0, -52, -55, -60];
    let old = 0, older = 0;
    let srci = 0, tmp, filter, flags;
    const out = [];

    while (srci < srcbuf.length) {
        filter = srcbuf[srci++];
        const shift = filter & 0xf;
        filter >>= 4;

        flags = srcbuf[srci++];
        // if (flags & 1) break;
        // if ((flags & 4) > 0)

        for (let i=0; i<28; ++i) {
            tmp = srcbuf[srci++];
            DecodeNibble(true, shift, filter, tmp);
            DecodeNibble(false, shift, filter, tmp);
        }
    }
    debug(srcbuf.length, out.length)
    return new Uint8Array(out);

    function Signed4bit(number) {
        if ((number & 0x8) == 0x8) {
            return (number & 0x7) - 8;
        } else {
            return number;
        }
    }

    function MinMax(number, min, max) {
        if (number < min) return min;
        if (number > max) return max;
        return number;
    }

    function SignExtend(s) {
        if (s & 0x8000) s |= 0xffff0000;
        return s;
    }

    function DecodeNibble(firstNibble, shift, filter, d) {
        let f0 = pos_adpcm_table[filter] / 64.0;
        let f1 = neg_adpcm_table[filter] / 64.0;
        let s = firstNibble ? (d & 0x0f) << 12 : (d & 0xf0) << 8;
        s = SignExtend(s);
        const sample = (s >> shift) + old * f0 + older * f1;
        older = old;
        old = sample;
        const x = parseInt(sample + 0.5);
        pushback(x & 0xFF);
        pushback(x >> 8);
    }

    function pushback(x) {
        out.push(x);
    }
}


function debug() {
    Tool.debug.apply(null, arguments);
}