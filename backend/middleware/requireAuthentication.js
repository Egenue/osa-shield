export default async function requireAuthentication(request, reply) {
  if (!request.session?.userId) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
}
