export default async function requireAdmin(request, reply) {
  if (!request.session?.userId) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  if (request.session.userRole !== "admin") {
    return reply.code(403).send({ message: "Forbidden" });
  }
}
