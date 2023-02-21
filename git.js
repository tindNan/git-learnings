import { $, chalk } from 'zx'
import { promisify } from 'node:util'
import { inflate } from 'node:zlib'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// clean up and remove the .git folder
await $`rm -rf .git hello.txt world.txt`

// initialize git
await $`git init .`

// create two files
await $`echo "hello" > hello.txt`
await $`echo "world" > world.txt`

// commit the files
await $`git add hello.txt world.txt`
await $`git commit -m "first commit"`


// - draw user attention to the terminal tab with watch command running
// talk about the commit hash

// look at the files created
// await $`tree .git`
// await $`cat .git/COMMIT_EDITMSG`
// await $`cat .git/index`
// await $`cat .git/logs/HEAD`
// await $`cat .git/logs/refs/heads/main`
// await $`cat .git/refs/heads/main`


// now let's take a look into git's database

// first off, get the current commmit's shortened hash. Explain why this interesting
const lastCommitHash = (await $`git rev-parse HEAD`).stdout.replace(/\r?\n|\r/g, "");
console.log(chalk.bgRed(lastCommitHash.slice(0, 6)))

// welcome git cat-file
// this is a command that can show you the object stored in git's database
console.log(chalk.bgCyan('==========================='))
await $`git cat-file -p ${lastCommitHash}`
await $`git cat-file -p ${lastCommitHash.slice(0, 6)}`


// you'll notice that the commit points to a tree with a certain hash.
// let's run git cat-file again and see what's in the hash
// NB: remember to copy the hash here
const treeHash = (await $`git cat-file -p ${lastCommitHash}`).stdout
   .split('\n')[0]
   .split(' ')[1]

// check the tree
await $`git cat-file -p ${treeHash}`

console.log('\n======EXTRACTING FILE HASHES======\n')
const treeContents = (await $`git cat-file -p ${treeHash}`).stdout
  .split('\n')

const [helloFileHash, worldFileHash] = treeContents
  .filter((i) => i !== '')
  .map((entry) => entry.split(' ')[2].split('\t')[0])

console.log(helloFileHash, worldFileHash)

// let's continue walking down git and see the contents of hello.txt and world.txt
await $`git cat-file -p ${helloFileHash}`
await $`git cat-file -p ${worldFileHash}`

// let's now have a look at .git/objects and inspect the file structure.
// notice the files
// Git organizes files by abbreviating the files' commit hash 
// it does this because sometimes the OS can struggle if a directory has too many files
// await $`tree .git/objects`

// what's the contents in .git/objects?
// an actual file or gibberish?
await $`cat .git/objects/ce/013625030ba8dba906f756967f9e9ca394464a`

console.log('\n\n', chalk.underline.bgCyanBright("WHAT'S GOING ON?"), '\n')

// turns out this is a compressed file
// based on the git spec, we know that the file has been compressed using zlib
// we'll leverage the zlib module in node to unpack the contents of the gibberish
const inflatePromise = promisify(inflate)

const helloGibberish = await readFile('.git/objects/ce/013625030ba8dba906f756967f9e9ca394464a')
const decompressedHelloObject = await(inflatePromise(helloGibberish)
  .then((buf) => {
    console.log(buf)
    return buf.toString()
  }))


console.log('=====DECOMPRESSED OBJECT======', '\n', chalk.yellow(decompressedHelloObject))

// what does blob6 mean?
// blob - the type of object stored (as opposed to tag/commit/tree)
// 6- the number of bytes in hello
// however is the bit 6hello
// let's inspect the buffer output and try to reacreate some stuff
// console.log(Buffer.from('blob 6'))
// console.log(Buffer.from('hello'))

// where are the other bytes comming from?
// new line at the end of hello
// null byte between 6 and hello (you won't get this in the terminal output unless you see the hexdump)

// EXERCISE FOR THE TEAM TO FIGURE OUT WHAT'S STORED IN THE CONTENTS OF A "TREE OBJECT"

// Lastly we will look at how are these random IDs generate
// ANY GUESSES?

// SHOULD BE SHA1
// let's use it with our "hello" string
const str = 'hello\n'
console.log('Raw Digest: ', createHash('sha1').update(str).digest('hex'))

const gitObjextText = `blob ${Buffer.byteLength(str, 'utf-8') + '\0'}${str}`
console.log('Git Object Id: ', createHash('sha1').update(gitObjextText).digest('hex'))
// 
