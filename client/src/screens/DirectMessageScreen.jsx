import { useOutletContext, useParams } from "react-router-dom";
import Conversation from "../components/Conversation";
import { EmptyState } from "../components/StatusView";
import { directMessageService } from "../services";
import { sameId } from "../utils/format";

const DirectMessageScreen = () => {
  const { user_id: userId } = useParams();
  const { workspace, user } = useOutletContext();
  const member = workspace.members?.find((item) => sameId(item.id, userId));

  if (!member) {
    return (
      <EmptyState title="Persona no encontrada.">
        <p>No es miembro de este espacio de trabajo.</p>
      </EmptyState>
    );
  }

  const isSelf = member.id === user?.id;

  return (
    <Conversation
      key={`${workspace.id}-${member.id}`}
      currentUser={user}
      storageKey={`dm-${workspace.id}-${member.id}`}
      title={isSelf ? `${member.name} (vos)` : member.name}
      subtitle={isSelf ? "Tu espacio personal: notas y borradores" : member.email}
      placeholder={`Escribe un mensaje a ${member.name}`}
      loadMessages={() => directMessageService.getMessages(workspace.id, member.id)}
      sendMessage={(body) => directMessageService.sendMessage(workspace.id, member.id, body)}
    />
  );
};

export default DirectMessageScreen;
