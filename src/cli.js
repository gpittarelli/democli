import {Demo} from 'tf2-demo';
import fs from 'fs';
import commander from 'commander';
import {version} from '../package.json';
import JSONStreamStringify from 'json-stream-stringify';
import emitStream from 'emit-stream';
import {Readable} from 'stream';
import es from 'event-stream';
import h from 'highland';

const usage = commander
  .version(version)
  .usage('[options] [file]')
  .description(`Reads in a .dem file and outputs packets as json`)
  .option('--sync');

const PacketType = {
	file              : 2,
	netTick           : 3,
	stringCmd         : 4,
	setConVar         : 5,
	sigOnState        : 6,
	print             : 7,
	serverInfo        : 8,
	classInfo         : 10,
	setPause          : 11,
	createStringTable : 12,
	updateStringTable : 13,
	voiceInit         : 14,
	voiceData         : 15,
	parseSounds       : 17,
	setView           : 18,
	fixAngle          : 19,
	bspDecal          : 21,
	userMessage       : 23,
	entityMessage     : 24,
	gameEvent         : 25,
	packetEntities    : 26,
	tempEntities      : 27,
	preFetch          : 28,
	menu              : 29,
	gameEventList     : 30,
	getCvarValue      : 30,
	cmdKeyValues      : 32
}

export default function cli(argv) {
  const {args: [filename = '-'], sync = false} = usage.parse(argv);
  process.stdout.setMaxListeners(0);
  //  console.log('filename', filename, sync);

  if (sync) {
    const body = fs.readFileSync(filename),
    dem = Demo.fromNodeBuffer(body),
    parser = dem.getParser();

    console.log(JSON.stringify(parser.readHeader()));

    parser.on('packet', x => console.log(JSON.stringify(x)));
    parser.parseBody();
  } else {
    const dem = Demo.fromNodeStream(fs.createReadStream(filename)),
      parser = dem.getParser();

    parser.skipPackets = [
      PacketType.packetEntities,
      PacketType.tempEntities,
      PacketType.entityMessage,
      12,13,4
    ];

    h(new Readable({objectMode: true})
      .wrap(parser)
      .pipe(es.map((x,cb)=>{
        //  console.log('IN PIPE', x);
        if (x.packetType === 'stringTable') {
          x = {packetType: 'stringTable', moreData: 'nope'};
        }
        cb(null, x);
      }))
     )
      .flatMap(o => h(JSONStreamStringify(o)).append('\n'))
      .pipe(process.stdout);
    parser.start();
  }
}

//      console.log(x.packetType);
//      JSON.stringify(x);
//    });

//    parser.skipPackets = [];

//    parser.on('data', x => { console.log('parser', x); });
//    FUCK.on('data', x => { console.log('FUCK',x); });
/* , function (o) {
   console.log(o);
   if (o && o._view) {
   return {};
   }
   return o;
   } */
