import { publishOrderArtifacts } from "../src/lib/agents/deliver.ts";

const orderId = process.argv[2] ?? "bc18eca75c6f94a9d04c9cd7";

console.log(`Republicando pedido ${orderId} no GitHub...`);
await publishOrderArtifacts(orderId);
console.log("Concluído.");
